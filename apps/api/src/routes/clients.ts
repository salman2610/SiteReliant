import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';
import { ClientCreateSchema } from '@siteguard/shared';
import { authenticateAndAuthorize } from '../auth.js';

export const clientRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/organizations/:orgId/clients', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;

    const clients = await prisma.client.findMany({
      where: { organizationId: orgId },
      include: {
        sites: {
          select: {
            id: true,
            name: true,
            status: true,
            isActive: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = clients.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      contactEmail: c.contactEmail,
      timezone: c.timezone,
      portalAccessKey: c.portalAccessKey,
      portalEnabled: c.portalEnabled,
      createdAt: c.createdAt,
      siteCount: c.sites.length,
      sitesHealthy: c.sites.filter((s) => s.status === 'healthy').length,
      sitesDegraded: c.sites.filter((s) => s.status === 'degraded').length,
      sitesDown: c.sites.filter((s) => s.status === 'down').length,
    }));

    return reply.send({ data });
  });

  app.post('/api/v1/organizations/:orgId/clients', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin', 'operator']);
    const orgId = req.organization!.id;

    const parseResult = ClientCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid client input data',
          issues: parseResult.error.issues,
        },
      });
    }

    const { name, contactEmail, timezone, portalEnabled } = parseResult.data;
    let slug = parseResult.data.slug;
    if (!slug) {
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const client = await prisma.client.create({
      data: {
        organizationId: orgId,
        name,
        slug,
        contactEmail,
        timezone,
        portalEnabled: portalEnabled ?? true,
      },
    });

    return reply.status(201).send({ data: client });
  });

  // Client Portal Settings management
  app.patch('/api/v1/organizations/:orgId/clients/:clientId/portal', async (req, reply) => {
    await authenticateAndAuthorize(req, reply, ['owner', 'admin']);
    const orgId = req.organization!.id;
    const { clientId } = req.params as { clientId: string };

    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    });

    if (!client) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Client not found in this organization' },
      });
    }

    const body = req.body as { portalEnabled?: boolean; regenerateKey?: boolean };
    const updateData: { portalEnabled?: boolean; portalAccessKey?: string } = {};

    if (typeof body.portalEnabled === 'boolean') {
      updateData.portalEnabled = body.portalEnabled;
    }

    if (body.regenerateKey) {
      updateData.portalAccessKey = `key_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    return reply.send({ data: updated });
  });
};
