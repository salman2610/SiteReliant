import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';
import { validateAndNormalizeUrl, resolveAndValidateHost } from '@siteguard/security';
import {
  runHttpCheck,
  runTlsCheck,
  runDnsCheck,
  runRedirectCheck,
  runSecurityHeadersCheck,
} from '@siteguard/monitoring';
import { SiteCreateSchema } from '@siteguard/shared';
import { authenticateAndAuthorize } from '../auth.js';

export const siteRoutes: FastifyPluginAsync = async (app) => {
  // List sites
  app.get('/api/v1/organizations/:orgId/sites', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;
    const query = req.query as { clientId?: string; status?: string };

    const where: any = { organizationId: orgId };
    if (query.clientId) where.clientId = query.clientId;
    if (query.status) where.status = query.status;

    const sites = await prisma.site.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        checkPolicies: { where: { enabled: true }, select: { checkType: true, intervalSeconds: true } },
        incidents: { where: { status: 'open' }, select: { id: true, title: true, severity: true } },
        browserMonitors: { where: { enabled: true }, select: { id: true, name: true, intervalSeconds: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = sites.map((s) => {
      const httpPolicy = s.checkPolicies.find((p) => p.checkType === 'http');
      return {
        id: s.id,
        name: s.name,
        url: s.url,
        normalizedHost: s.normalizedHost,
        status: s.status,
        isActive: s.isActive,
        emailAlertMode: s.emailAlertMode || 'failure_recovery',
        intervalSeconds: httpPolicy?.intervalSeconds || 300,
        client: s.client,
        enabledChecks: s.checkPolicies.map((p) => p.checkType),
        browserMonitorsCount: s.browserMonitors.length,
        openIncidents: s.incidents,
        createdAt: s.createdAt,
      };
    });

    return reply.send({ data });
  });

  // Register site
  app.post('/api/v1/organizations/:orgId/sites', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;

    const parseResult = SiteCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid site payload',
          issues: parseResult.error.issues,
        },
      });
    }

    const { clientId, name, url, checks } = parseResult.data;

    // Verify client belongs to this organization
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });
    if (!client) {
      return reply.status(404).send({
        error: { code: 'CLIENT_NOT_FOUND', message: 'Client does not belong to this organization.' },
      });
    }

    // SSRF & URL validation
    const urlNorm = validateAndNormalizeUrl(url);
    if (!urlNorm.valid) {
      return reply.status(400).send({
        error: { code: 'INVALID_URL', message: urlNorm.error || 'The provided URL is invalid.' },
      });
    }

    const hostSafe = await resolveAndValidateHost(urlNorm.normalizedHost);
    if (!hostSafe.safe) {
      return reply.status(400).send({
        error: {
          code: 'SSRF_RESTRICTED',
          message: `The host '${urlNorm.normalizedHost}' cannot be monitored: ${hostSafe.error}`,
        },
      });
    }

    const intervalMap: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
    };
    const httpInterval = intervalMap[parseResult.data.checkInterval || '5m'] || 300;
    const alertMode = parseResult.data.emailAlertMode || 'failure_recovery';

    // Create Site
    const site = await prisma.site.create({
      data: {
        organizationId: orgId,
        clientId,
        name,
        url: urlNorm.normalizedUrl,
        normalizedHost: urlNorm.normalizedHost,
        status: 'pending',
        isActive: true,
        emailAlertMode: alertMode,
      },
    });

    // Create configured check policies
    const policyDefinitions = [
      { type: 'http', enabled: checks.http, interval: httpInterval },
      { type: 'tls', enabled: checks.tls, interval: Math.max(httpInterval * 4, 3600) },
      { type: 'dns', enabled: checks.dns, interval: Math.max(httpInterval * 2, 900) },
      { type: 'redirect', enabled: checks.redirects, interval: 21600 },
      { type: 'headers', enabled: checks.securityHeaders, interval: 21600 },
    ];

    for (const p of policyDefinitions) {
      await prisma.checkPolicy.create({
        data: {
          organizationId: orgId,
          siteId: site.id,
          checkType: p.type,
          intervalSeconds: p.interval,
          timeoutMs: 10000,
          failureThreshold: 2,
          recoveryThreshold: 2,
          enabled: p.enabled,
        },
      });
    }

    if (checks.browser) {
      await prisma.browserMonitor.create({
        data: {
          organizationId: orgId,
          siteId: site.id,
          name: `${site.name} Browser Journey`,
          description: `Automatic browser user-journey test for ${site.url}`,
          intervalSeconds: Math.max(httpInterval * 3, 900),
          workflowJson: {
            name: `${site.name} User Journey`,
            targetUrl: site.url,
            steps: [
              { id: 'step-1', action: 'navigate', targetSelector: site.url, optional: false },
              { id: 'step-2', action: 'assert', assertionType: 'response_status', expectedValue: '200', optional: false },
              { id: 'step-3', action: 'screenshot', targetSelector: 'body', optional: true },
            ],
          },
          timeoutMs: 30000,
          enabled: true,
        },
      });
    }

    let initialStatus = site.status;
    let initialCheck: any = null;
    if (parseResult.data.runImmediateCheck !== false && checks.http) {
      const httpPolicy = await prisma.checkPolicy.findFirst({
        where: { siteId: site.id, checkType: 'http' },
      });
      if (httpPolicy) {
        try {
          const res = await runHttpCheck(site.url, { timeoutMs: 10000 });
          initialStatus = res.success ? 'healthy' : 'down';
          await prisma.site.update({
            where: { id: site.id },
            data: { status: initialStatus },
          });
          initialCheck = await prisma.checkResult.create({
            data: {
              organizationId: orgId,
              siteId: site.id,
              policyId: httpPolicy.id,
              checkedAt: new Date(),
              success: res.success,
              resultCode: res.resultCode,
              httpStatus: res.httpStatus ?? null,
              latencyMs: res.latencyMs,
              errorCategory: res.errorCategory ?? null,
              detailsJson: res.details || res,
            },
          });
        } catch {
          // Ignore initial check transient error
        }
      }
    }

    return reply.status(201).send({
      data: {
        id: site.id,
        name: site.name,
        url: site.url,
        normalizedHost: site.normalizedHost,
        status: initialStatus,
        monitoringEnabled: site.isActive,
        initialCheck: initialCheck ? {
          success: initialCheck.success,
          latencyMs: initialCheck.latencyMs,
          httpStatus: initialCheck.httpStatus,
          resultCode: initialCheck.resultCode,
        } : null,
      },
    });
  });

  // Get site details
  app.get('/api/v1/organizations/:orgId/sites/:siteId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;
    const { siteId } = req.params as { siteId: string };

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
      include: {
        client: true,
        checkPolicies: true,
        incidents: {
          where: { status: { in: ['open', 'acknowledged'] } },
          include: { events: { orderBy: { createdAt: 'desc' }, take: 3 } },
        },
      },
    });

    if (!site) {
      return reply.status(404).send({
        error: { code: 'SITE_NOT_FOUND', message: 'Site not found.' },
      });
    }

    // Get latest check result for each policy
    const latestChecks: Record<string, any> = {};
    for (const policy of site.checkPolicies) {
      const lastCheck = await prisma.checkResult.findFirst({
        where: { siteId: site.id, policyId: policy.id },
        orderBy: { checkedAt: 'desc' },
      });
      if (lastCheck) {
        latestChecks[policy.checkType] = lastCheck;
      }
    }

    return reply.send({
      data: {
        ...site,
        latestChecks,
      },
    });
  });

  // Query check history
  app.get('/api/v1/organizations/:orgId/sites/:siteId/checks', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;
    const { siteId } = req.params as { siteId: string };
    const query = req.query as { limit?: string; checkType?: string };

    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const where: any = { siteId, organizationId: orgId };

    const checks = await prisma.checkResult.findMany({
      where,
      orderBy: { checkedAt: 'desc' },
      take: limit,
      include: { policy: { select: { checkType: true } } },
    });

    return reply.send({
      data: checks.map((c) => ({
        id: c.id,
        checkType: c.policy.checkType,
        checkedAt: c.checkedAt,
        success: c.success,
        resultCode: c.resultCode,
        httpStatus: c.httpStatus,
        latencyMs: c.latencyMs,
        errorCategory: c.errorCategory,
        details: c.detailsJson,
      })),
    });
  });

  // Run manual check
  app.post('/api/v1/organizations/:orgId/sites/:siteId/checks/run', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { siteId } = req.params as { siteId: string };
    const body = (req.body || {}) as { checkType?: string };
    const checkType = body.checkType || 'http';

    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
      include: { checkPolicies: true },
    });

    if (!site) {
      return reply.status(404).send({
        error: { code: 'SITE_NOT_FOUND', message: 'Site not found.' },
      });
    }

    if (checkType === 'all') {
      const results: any[] = [];
      let httpSuccess: boolean | null = null;

      for (const pol of site.checkPolicies) {
        if (!pol.enabled) continue;
        let res: any = null;
        try {
          if (pol.checkType === 'http') {
            res = await runHttpCheck(site.url, { timeoutMs: pol.timeoutMs });
            httpSuccess = res.success;
          } else if (pol.checkType === 'tls') {
            res = await runTlsCheck(site.url, pol.timeoutMs);
          } else if (pol.checkType === 'dns') {
            res = await runDnsCheck(site.url);
          } else if (pol.checkType === 'redirect') {
            res = await runRedirectCheck(site.url);
          } else if (pol.checkType === 'headers') {
            res = await runSecurityHeadersCheck(site.url, pol.timeoutMs);
          }
        } catch {
          // Skip unhandled check exceptions
        }

        if (res) {
          const rec = await prisma.checkResult.create({
            data: {
              organizationId: orgId,
              siteId: site.id,
              policyId: pol.id,
              checkedAt: new Date(),
              success: res.success,
              resultCode: res.resultCode,
              httpStatus: res.httpStatus ?? null,
              latencyMs: res.latencyMs,
              errorCategory: res.errorCategory ?? null,
              detailsJson: res.details || res,
            },
          });
          results.push({
            checkId: rec.id,
            checkType: pol.checkType,
            success: res.success,
            latencyMs: res.latencyMs,
            resultCode: res.resultCode,
            details: res.details || res,
          });
        }
      }

      if (httpSuccess !== null) {
        await prisma.site.update({
          where: { id: site.id },
          data: { status: httpSuccess ? 'healthy' : 'down' },
        });
      }

      return reply.status(202).send({
        message: 'All monitoring checks completed and recorded.',
        data: {
          siteId: site.id,
          checkType: 'all',
          success: httpSuccess ?? true,
          results,
        },
      });
    }

    const policy = site.checkPolicies.find((p) => p.checkType === checkType);
    if (!policy) {
      return reply.status(400).send({
        error: { code: 'POLICY_NOT_FOUND', message: `No active policy configured for check '${checkType}'.` },
      });
    }

    // Execute check safely
    let result: any;
    if (checkType === 'http') {
      result = await runHttpCheck(site.url, { timeoutMs: policy.timeoutMs });
    } else if (checkType === 'tls') {
      result = await runTlsCheck(site.url, policy.timeoutMs);
    } else if (checkType === 'dns') {
      result = await runDnsCheck(site.url);
    } else if (checkType === 'redirect') {
      result = await runRedirectCheck(site.url);
    } else if (checkType === 'headers') {
      result = await runSecurityHeadersCheck(site.url, policy.timeoutMs);
    }

    // Persist observation
    const checkRecord = await prisma.checkResult.create({
      data: {
        organizationId: orgId,
        siteId: site.id,
        policyId: policy.id,
        checkedAt: new Date(),
        success: result.success,
        resultCode: result.resultCode,
        httpStatus: result.httpStatus ?? null,
        latencyMs: result.latencyMs,
        errorCategory: result.errorCategory ?? null,
        detailsJson: result.details || result,
      },
    });

    // Update site status if HTTP check succeeded or failed
    if (checkType === 'http') {
      await prisma.site.update({
        where: { id: site.id },
        data: { status: result.success ? 'healthy' : 'down' },
      });
    }

    return reply.status(202).send({
      message: 'Check completed and recorded.',
      data: {
        checkId: checkRecord.id,
        siteId: site.id,
        checkType,
        success: result.success,
        resultCode: result.resultCode,
        latencyMs: result.latencyMs,
        details: result.details || result,
      },
    });
  });

  // Update site
  app.patch('/api/v1/organizations/:orgId/sites/:siteId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { siteId } = req.params as { siteId: string };
    const body = req.body as {
      name?: string;
      isActive?: boolean;
      emailAlertMode?: string;
      checkInterval?: string;
    };

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.emailAlertMode !== undefined) updateData.emailAlertMode = body.emailAlertMode;

    const site = await prisma.site.update({
      where: { id: siteId, organizationId: orgId },
      data: updateData,
    });

    if (body.checkInterval) {
      const intervalMap: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '30m': 1800,
        '1h': 3600,
      };
      const sec = intervalMap[body.checkInterval] || 300;
      await prisma.checkPolicy.updateMany({
        where: { siteId, checkType: 'http' },
        data: { intervalSeconds: sec },
      });
    }

    if (body.isActive !== undefined) {
      await prisma.checkPolicy.updateMany({
        where: { siteId },
        data: { enabled: body.isActive },
      });
      await prisma.browserMonitor.updateMany({
        where: { siteId },
        data: { enabled: body.isActive },
      });
    }

    return reply.send({ data: site });
  });

  // Delete site
  app.delete('/api/v1/organizations/:orgId/sites/:siteId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;
    const { siteId } = req.params as { siteId: string };

    await prisma.site.delete({
      where: { id: siteId, organizationId: orgId },
    });

    return reply.send({ success: true, message: 'Site removed successfully.' });
  });
};
