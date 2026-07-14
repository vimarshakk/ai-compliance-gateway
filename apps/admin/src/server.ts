import Fastify, { type FastifyInstance } from 'fastify';
import pino from 'pino';
import { registerV1Routes } from './v1/index.js';
import { registerV2Routes } from './v2/index.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerEngineRoutes } from './engines/index.js';
import { registerAuditHooks } from './middleware/audit.js';

const logger = pino({ name: 'acg-admin', level: process.env.LOG_LEVEL ?? 'info' });

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy: true });

  await app.register(import('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(import('@fastify/swagger'), {
    openapi: {
      info: { title: 'AI Compliance Gateway Admin API', version: '2.0.0', description: 'Admin and management API for ACG' },
      servers: [{ url: process.env.ADMIN_URL ?? 'http://localhost:3002' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await app.register(import('@fastify/swagger-ui'), { routePrefix: '/docs' });

  await registerHealthRoutes(app);
  registerAuditHooks(app);
  await registerV1Routes(app);
  await registerV2Routes(app);
  await registerEngineRoutes(app);

  return app;
}

const PORT = parseInt(process.env.ADMIN_PORT ?? '3002', 10);
const HOST = process.env.ADMIN_HOST ?? '0.0.0.0';

buildApp()
  .then(async (app) => {
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Admin API listening on ${HOST}:${PORT}`);
  })
  .catch((err) => {
    logger.error(err, 'Failed to start admin');
    process.exit(1);
  });
