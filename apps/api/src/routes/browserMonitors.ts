import type { FastifyPluginAsync } from 'fastify';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { prisma } from '@siteguard/database';
import { BrowserMonitorCreateSchema } from '@siteguard/browser-monitoring';
import { executeBrowserMonitorRun } from '@siteguard/worker/dist/browser-job-consumer.js';
import { authenticateAndAuthorize } from '../auth.js';

export const browserMonitorRoutes: FastifyPluginAsync = async (app) => {
  // List all browser monitors for an agency tenant
  app.get('/api/v1/organizations/:orgId/browser-monitors', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    if (reply.sent) return;
    const orgId = req.organization!.id;

    const monitors = await prisma.browserMonitor.findMany({
      where: { organizationId: orgId },
      include: {
        site: {
          select: { id: true, name: true, url: true, status: true },
        },
        runs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            durationMs: true,
            failureMessage: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = monitors.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      siteId: m.siteId,
      siteName: m.site.name,
      siteUrl: m.site.url,
      siteStatus: m.site.status,
      intervalSeconds: m.intervalSeconds,
      timeoutMs: m.timeoutMs,
      enabled: m.enabled,
      createdAt: m.createdAt,
      lastRun: m.runs[0] || null,
    }));

    return reply.send({ data });
  });

  // Create new browser monitor
  app.post('/api/v1/organizations/:orgId/browser-monitors', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    if (reply.sent) return;
    const orgId = req.organization!.id;

    const parse = BrowserMonitorCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid browser monitor schema', issues: parse.error.issues },
      });
    }

    const { siteId, name, description, intervalSeconds, timeoutMs, failureThreshold, recoveryThreshold, enabled, workflow } = parse.data;

    // Multi-tenant check: ensure site belongs to orgId
    const site = await prisma.site.findFirst({
      where: { id: siteId, organizationId: orgId },
    });

    if (!site) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Site not found in this organization' },
      });
    }

    const created = await prisma.browserMonitor.create({
      data: {
        organizationId: orgId,
        siteId,
        name,
        description,
        intervalSeconds,
        timeoutMs,
        failureThreshold,
        recoveryThreshold,
        enabled,
        workflowJson: workflow as any,
      },
    });

    return reply.status(201).send({ data: created });
  });

  // Get single browser monitor with recent runs
  app.get('/api/v1/organizations/:orgId/browser-monitors/:monitorId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    if (reply.sent) return;
    const orgId = req.organization!.id;
    const { monitorId } = req.params as { monitorId: string };

    const monitor = await prisma.browserMonitor.findFirst({
      where: { id: monitorId, organizationId: orgId },
      include: {
        site: true,
        runs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            steps: {
              orderBy: { stepIndex: 'asc' },
            },
            assertions: true,
            artifacts: true,
          },
        },
      },
    });

    if (!monitor) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Browser monitor not found' },
      });
    }

    return reply.send({ data: monitor });
  });

  // Run browser monitor on-demand (Manual probe / Fix verification)
  app.post('/api/v1/organizations/:orgId/browser-monitors/:monitorId/run', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    if (reply.sent) return;
    const orgId = req.organization!.id;
    const { monitorId } = req.params as { monitorId: string };

    const monitor = await prisma.browserMonitor.findFirst({
      where: { id: monitorId, organizationId: orgId },
    });

    if (!monitor) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Browser monitor not found in this organization' },
      });
    }

    try {
      const runResult = await executeBrowserMonitorRun(monitor.id, {
        triggerActor: req.user?.name || 'operator',
      });

      return reply.send({ data: runResult });
    } catch (err: any) {
      return reply.status(500).send({
        error: { code: 'RUN_FAILED', message: err.message },
      });
    }
  });

  // Inspect specific browser run details
  app.get('/api/v1/organizations/:orgId/browser-runs/:runId', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    if (reply.sent) return;
    const orgId = req.organization!.id;
    const { runId } = req.params as { runId: string };

    const run = await prisma.browserRun.findFirst({
      where: { id: runId, organizationId: orgId },
      include: {
        monitor: {
          select: { id: true, name: true, siteId: true },
        },
        steps: {
          orderBy: { stepIndex: 'asc' },
          include: {
            assertions: true,
            artifacts: true,
          },
        },
        assertions: true,
        artifacts: true,
      },
    });

    if (!run) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Browser run not found in this organization' },
      });
    }

    return reply.send({ data: run });
  });

  // Secure Artifact / Screenshot image server with path traversal mitigation
  app.get('/api/v1/artifacts/screenshots/:filename', async (req, reply) => {
    const { filename } = req.params as { filename: string };
    const safeBase = '/home/sesame-ai/SiteGuard/storage/artifacts/screenshots';
    const safeTarget = path.normalize(path.join(safeBase, filename));

    if (!safeTarget.startsWith(safeBase)) {
      return reply.status(400).send({ error: { code: 'INVALID_PATH', message: 'Path traversal denied' } });
    }

    try {
      const buffer = await fs.readFile(safeTarget);
      return reply.type('image/png').send(buffer);
    } catch {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Screenshot artifact not found' } });
    }
  });
};
