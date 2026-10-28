import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';

export const portalRoutes: FastifyPluginAsync = async (app) => {
  // Public Client Portal Data Endpoint (White-Label)
  app.get('/api/v1/portal/:clientSlug', async (req, reply) => {
    const { clientSlug } = req.params as { clientSlug: string };
    const query = req.query as { key?: string };

    const client = await prisma.client.findUnique({
      where: { slug: clientSlug },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandLogoUrl: true,
            brandPrimaryColor: true,
            brandAccentColor: true,
            customDomain: true,
            supportEmail: true,
            portalHeading: true,
            portalSubheading: true,
          },
        },
        sites: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            url: true,
            status: true,
            normalizedHost: true,
            createdAt: true,
            checkResults: {
              take: 1,
              orderBy: { checkedAt: 'desc' },
              select: {
                checkedAt: true,
                latencyMs: true,
                httpStatus: true,
                resultCode: true,
                success: true,
              },
            },
          },
        },
      },
    });

    if (!client || !client.portalEnabled) {
      return reply.status(404).send({
        error: {
          code: 'PORTAL_NOT_FOUND',
          message: 'Client portal not found or disabled by agency administrator',
        },
      });
    }

    // If client has a portalAccessKey configured, check if provided key matches (optional security layer)
    const accessKey = (req.headers['x-portal-key'] as string) || query.key;
    if (client.portalAccessKey && accessKey && client.portalAccessKey !== accessKey) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED_PORTAL_ACCESS', message: 'Invalid portal access key' },
      });
    }

    const siteIds = client.sites.map((s) => s.id);

    // Fetch recent incidents and verified remediations for this client's sites only
    const incidents = await prisma.incident.findMany({
      where: {
        siteId: { in: siteIds },
      },
      orderBy: { openedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        siteId: true,
        checkType: true,
        severity: true,
        status: true,
        title: true,
        openedAt: true,
        resolvedAt: true,
        remediationNotes: true,
        remediationActor: true,
        remediatedAt: true,
        verifiedAt: true,
        verificationEvidence: true,
        site: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    // Compute overall service status
    const hasDown = client.sites.some((s) => s.status === 'down');
    const hasDegraded = client.sites.some((s) => s.status === 'degraded');
    const overallStatus = hasDown ? 'major_outage' : hasDegraded ? 'degraded' : 'operational';

    // Format sites with latest check
    const formattedSites = client.sites.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      status: s.status,
      normalizedHost: s.normalizedHost,
      lastCheck: s.checkResults[0] || null,
    }));

    // Latest ready report
    const latestReport = await prisma.report.findFirst({
      where: {
        clientId: client.id,
        status: 'ready',
      },
      orderBy: { periodEnd: 'desc' },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        uptimePercentage: true,
        generatedAt: true,
      },
    });

    return reply.send({
      data: {
        agency: {
          name: client.organization.name,
          brandLogoUrl: client.organization.brandLogoUrl,
          brandPrimaryColor: client.organization.brandPrimaryColor || '#0ea5e9',
          brandAccentColor: client.organization.brandAccentColor || '#6366f1',
          customDomain: client.organization.customDomain,
          supportEmail: client.organization.supportEmail,
          portalHeading: client.organization.portalHeading || `${client.name} — Service Reliability Portal`,
          portalSubheading:
            client.organization.portalSubheading ||
            `Real-time SLA uptime, security posture, and verified remediations managed by ${client.organization.name}.`,
        },
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug,
          timezone: client.timezone,
        },
        serviceStatus: overallStatus,
        sites: formattedSites,
        incidents,
        latestReport,
      },
    });
  });

  // Client Portal Reports List
  app.get('/api/v1/portal/:clientSlug/reports', async (req, reply) => {
    const { clientSlug } = req.params as { clientSlug: string };

    const client = await prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true, portalEnabled: true },
    });

    if (!client || !client.portalEnabled) {
      return reply.status(404).send({
        error: { code: 'PORTAL_NOT_FOUND', message: 'Client portal not found or disabled' },
      });
    }

    const reports = await prisma.report.findMany({
      where: {
        clientId: client.id,
        status: 'ready',
      },
      orderBy: { periodEnd: 'desc' },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        status: true,
        contentHash: true,
        uptimePercentage: true,
        dataJson: true,
        generatedAt: true,
      },
    });

    return reply.send({ data: reports });
  });
};
