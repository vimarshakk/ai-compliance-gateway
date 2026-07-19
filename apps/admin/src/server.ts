import Fastify, { type FastifyInstance } from 'fastify';
import pino from 'pino';
import { PrismaClient } from '@acg/database';
import { PluginRuntime, RuleEngine, Registry, AssetGraphEngine, EvidenceEngine } from '@acg/kernel';
import { registerV1Routes } from './v1/index.js';
import { registerV2Routes } from './v2/index.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerEngineRoutes } from './engines/index.js';
import { registerAuditHooks } from './middleware/audit.js';
import { requireAuth } from './middleware/auth.js';

const logger = pino({ name: 'acg-admin', level: process.env.LOG_LEVEL ?? 'info' });

// Singleton Prisma client for admin
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    kernel: {
      runtime: PluginRuntime;
      ruleEngine: RuleEngine;
      registry: Registry;
      assetGraph: AssetGraphEngine;
      evidenceEngine: EvidenceEngine;
    };
  }
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy: true });

  // Inject Prisma as decorate
  app.decorate('prisma', prisma);

  // Initialize kernel components
  const kernelRuntime = new PluginRuntime();
  const kernelRuleEngine = new RuleEngine();
  const kernelRegistry = new Registry();
  const kernelAssetGraph = new AssetGraphEngine();
  const kernelEvidenceEngine = new EvidenceEngine();
  app.decorate('kernel', {
    runtime: kernelRuntime,
    ruleEngine: kernelRuleEngine,
    registry: kernelRegistry,
    assetGraph: kernelAssetGraph,
    evidenceEngine: kernelEvidenceEngine,
  });
  logger.info('Kernel components initialized');

  await app.register(import('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  await app.register(import('@fastify/swagger'), {
    openapi: {
      info: { title: 'AI Compliance Gateway Admin API', version: '0.1.0', description: 'Admin and management API for ACG' },
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

  // Auth hook: require JWT or API key on all mutating routes (POST/PUT/DELETE/PATCH)
  app.addHook('onRequest', async (request, reply) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      await requireAuth(request, reply);
    }
  });

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

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down admin...');
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    logger.error(err, 'Failed to start admin');
    process.exit(1);
  });
