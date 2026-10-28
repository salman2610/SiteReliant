import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { overviewRoutes } from './routes/overview.js';
import { clientRoutes } from './routes/clients.js';
import { siteRoutes } from './routes/sites.js';
import { incidentRoutes } from './routes/incidents.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { portalRoutes } from './routes/portal.js';
import { browserMonitorRoutes } from './routes/browserMonitors.js';

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

await server.register(cors, {
  origin: true,
  credentials: true,
});

await server.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
});

// Health check endpoint
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register feature routes
await server.register(overviewRoutes);
await server.register(clientRoutes);
await server.register(siteRoutes);
await server.register(incidentRoutes);
await server.register(reportRoutes);
await server.register(settingsRoutes);
await server.register(portalRoutes);
await server.register(browserMonitorRoutes);

const port = parseInt(process.env.PORT || '4000', 10);
const host = '0.0.0.0';

try {
  await server.listen({ port, host });
  console.log(`🚀 SiteReliant API server running on http://localhost:${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
