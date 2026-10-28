import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@siteguard/database';
import { authenticateAndAuthorize } from '../auth.js';

export const overviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/v1/organizations/:orgId/overview', async (req, reply) => {
    await authenticateAndAuthorize(req, reply);
    const orgId = req.organization!.id;

    const [sitesCount, sitesHealthyCount, activeIncidents, openIncidentsCount] = await Promise.all([
      prisma.site.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.site.count({ where: { organizationId: orgId, status: 'healthy', isActive: true } }),
      prisma.incident.findMany({
        where: { organizationId: orgId, status: { in: ['open', 'acknowledged'] } },
        include: { site: true },
        orderBy: { openedAt: 'desc' },
        take: 5,
      }),
      prisma.incident.count({
        where: { organizationId: orgId, status: { in: ['open', 'acknowledged'] } },
      }),
    ]);

    // Check certificate warnings
    const certWarningCount = await prisma.incident.count({
      where: {
        organizationId: orgId,
        checkType: 'tls',
        status: { in: ['open', 'acknowledged'] },
      },
    });

    return reply.send({
      data: {
        organization: {
          id: req.organization!.id,
          name: req.organization!.name,
          slug: req.organization!.slug,
        },
        metrics: {
          totalSites: sitesCount,
          healthySites: sitesHealthyCount,
          activeIncidents: openIncidentsCount,
          certificatesExpiringSoon: certWarningCount,
          overallHealthScore: sitesCount > 0 ? Math.round((sitesHealthyCount / sitesCount) * 100) : 100,
        },
        recentIncidents: activeIncidents.map((inc) => ({
          id: inc.id,
          siteId: inc.siteId,
          siteName: inc.site.name,
          siteUrl: inc.site.url,
          title: inc.title,
          checkType: inc.checkType,
          severity: inc.severity,
          status: inc.status,
          openedAt: inc.openedAt,
        })),
      },
    });
  });
};
