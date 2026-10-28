import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';
import { authenticateAndAuthorize } from '../auth.js';

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  // List incidents
  app.get('/api/v1/organizations/:orgId/incidents', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;
    const query = req.query as { status?: string; siteId?: string };

    const where: any = { organizationId: orgId };
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }
    if (query.siteId) {
      where.siteId = query.siteId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        site: { select: { id: true, name: true, url: true, client: { select: { name: true } } } },
        events: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { openedAt: 'desc' },
    });

    return reply.send({
      data: incidents.map((inc) => ({
        id: inc.id,
        siteId: inc.siteId,
        siteName: inc.site.name,
        siteUrl: inc.site.url,
        clientName: inc.site.client.name,
        checkType: inc.checkType,
        severity: inc.severity,
        status: inc.status,
        title: inc.title,
        openedAt: inc.openedAt,
        resolvedAt: inc.resolvedAt,
        lastSeenAt: inc.lastSeenAt,
        latestEvent: inc.events[0] || null,
      })),
    });
  });

  // Get incident details and event timeline
  app.get('/api/v1/organizations/:orgId/incidents/:incidentId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;
    const { incidentId } = req.params as { incidentId: string };

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: orgId },
      include: {
        site: { include: { client: true } },
        events: { orderBy: { createdAt: 'desc' } },
        notificationDeliveries: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!incident) {
      return reply.status(404).send({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' },
      });
    }

    return reply.send({ data: incident });
  });

  // Acknowledge incident
  app.post('/api/v1/organizations/:orgId/incidents/:incidentId/acknowledge', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { incidentId } = req.params as { incidentId: string };

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: orgId },
    });

    if (!incident) {
      return reply.status(404).send({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' },
      });
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'acknowledged' },
    });

    await prisma.incidentEvent.create({
      data: {
        organizationId: orgId,
        incidentId: incident.id,
        eventType: 'acknowledged',
        message: `Incident acknowledged by ${req.user!.name}.`,
        metadataJson: { userId: req.user!.id },
      },
    });

    return reply.send({ data: updated });
  });

  // Resolve incident
  app.post('/api/v1/organizations/:orgId/incidents/:incidentId/resolve', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { incidentId } = req.params as { incidentId: string };

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: orgId },
    });

    if (!incident) {
      return reply.status(404).send({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' },
      });
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });

    await prisma.incidentEvent.create({
      data: {
        organizationId: orgId,
        incidentId: incident.id,
        eventType: 'resolved',
        message: `Incident manually marked as resolved by ${req.user!.name}.`,
        metadataJson: { userId: req.user!.id },
      },
    });

    // Mark site healthy if no other open incidents
    const otherOpen = await prisma.incident.count({
      where: { siteId: incident.siteId, status: { in: ['open', 'acknowledged'] } },
    });

    if (otherOpen === 0) {
      await prisma.site.update({
        where: { id: incident.siteId },
        data: { status: 'healthy' },
      });
    }

    return reply.send({ data: updated });
  });

  // Log remediation fix details
  app.post('/api/v1/organizations/:orgId/incidents/:incidentId/remediate', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { incidentId } = req.params as { incidentId: string };
    const body = req.body as {
      rootCauseCategory?: string;
      remediationNotes: string;
    };

    if (!body.remediationNotes) {
      return reply.status(400).send({
        error: { code: 'MISSING_NOTES', message: 'remediationNotes is required.' },
      });
    }

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: orgId },
    });

    if (!incident) {
      return reply.status(404).send({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' },
      });
    }

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        rootCauseCategory: body.rootCauseCategory || incident.rootCauseCategory,
        remediationNotes: body.remediationNotes,
        remediationActor: req.user!.name,
        remediatedAt: new Date(),
        status: incident.status === 'open' ? 'acknowledged' : incident.status,
      },
    });

    await prisma.incidentEvent.create({
      data: {
        organizationId: orgId,
        incidentId: incident.id,
        eventType: 'remediation_logged',
        message: `Remediation fix logged by ${req.user!.name}: "${body.remediationNotes}"`,
        metadataJson: {
          actor: req.user!.name,
          rootCauseCategory: body.rootCauseCategory,
          notes: body.remediationNotes,
        },
      },
    });

    return reply.send({
      message: 'Remediation action logged.',
      data: updated,
    });
  });

  // Execute one-click Fix Verification
  app.post('/api/v1/organizations/:orgId/incidents/:incidentId/verify-fix', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;
    const { incidentId } = req.params as { incidentId: string };

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId: orgId },
      include: { site: { include: { checkPolicies: true } } },
    });

    if (!incident) {
      return reply.status(404).send({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' },
      });
    }

    const site = incident.site;
    const checkType = incident.checkType;
    const policy = site.checkPolicies.find((p) => p.checkType === checkType) || site.checkPolicies[0];

    // Re-run the check using the safe, socket-pinned engine
    let checkResult: any;
    if (checkType === 'http') {
      const { runHttpCheck } = await import('@siteguard/monitoring');
      checkResult = await runHttpCheck(site.url, { timeoutMs: policy?.timeoutMs || 10000 });
    } else if (checkType === 'tls') {
      const { runTlsCheck } = await import('@siteguard/monitoring');
      checkResult = await runTlsCheck(site.url, policy?.timeoutMs || 8000);
    } else if (checkType === 'dns') {
      const { runDnsCheck } = await import('@siteguard/monitoring');
      checkResult = await runDnsCheck(site.url);
    } else if (checkType === 'redirect') {
      const { runRedirectCheck } = await import('@siteguard/monitoring');
      checkResult = await runRedirectCheck(site.url);
    } else {
      const { runSecurityHeadersCheck } = await import('@siteguard/monitoring');
      checkResult = await runSecurityHeadersCheck(site.url);
    }

    // Persist observation
    await prisma.checkResult.create({
      data: {
        organizationId: orgId,
        siteId: site.id,
        policyId: policy ? policy.id : site.checkPolicies[0].id,
        checkedAt: new Date(),
        success: checkResult.success,
        resultCode: checkResult.resultCode,
        httpStatus: checkResult.httpStatus ?? null,
        latencyMs: checkResult.latencyMs,
        errorCategory: checkResult.errorCategory ?? null,
        detailsJson: checkResult.details || checkResult,
      },
    });

    if (checkResult.success) {
      // Verified recovery!
      const mttrMinutes = Math.max(
        1,
        Math.round((Date.now() - incident.openedAt.getTime()) / 60000)
      );

      const resolved = await prisma.incident.update({
        where: { id: incident.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          verifiedAt: new Date(),
          verificationEvidence: {
            verifiedBy: req.user!.name,
            checkType,
            httpStatus: checkResult.httpStatus,
            latencyMs: checkResult.latencyMs,
            mttrMinutes,
            evidence: checkResult.details,
          },
        },
      });

      await prisma.incidentEvent.create({
        data: {
          organizationId: orgId,
          incidentId: incident.id,
          eventType: 'verification_passed',
          message: `Fix verified by ${req.user!.name}! Service confirmed healthy (Status: ${checkResult.httpStatus || 200}, Latency: ${checkResult.latencyMs}ms). Resolved in ${mttrMinutes} minutes.`,
          metadataJson: {
            verifiedBy: req.user!.name,
            latencyMs: checkResult.latencyMs,
            httpStatus: checkResult.httpStatus,
            mttrMinutes,
          },
        },
      });

      // Update site status
      const otherOpen = await prisma.incident.count({
        where: { siteId: site.id, status: { in: ['open', 'acknowledged'] } },
      });
      if (otherOpen === 0) {
        await prisma.site.update({
          where: { id: site.id },
          data: { status: 'healthy' },
        });
      }

      return reply.send({
        verified: true,
        message: `Remediation verified! Incident resolved in ${mttrMinutes} minutes.`,
        data: resolved,
        evidence: checkResult.details,
      });
    } else {
      // Verification check still failed
      await prisma.incidentEvent.create({
        data: {
          organizationId: orgId,
          incidentId: incident.id,
          eventType: 'verification_failed',
          message: `Verification check executed by ${req.user!.name} failed: Target site still returning ${checkResult.resultCode} (${checkResult.errorCategory || 'failure'}).`,
          metadataJson: {
            actor: req.user!.name,
            resultCode: checkResult.resultCode,
            httpStatus: checkResult.httpStatus,
            latencyMs: checkResult.latencyMs,
          },
        },
      });

      return reply.status(409).send({
        verified: false,
        message: `Remediation verification failed. The website is still reporting an issue (${checkResult.errorCategory || checkResult.resultCode}).`,
        details: checkResult.details,
      });
    }
  });
};
