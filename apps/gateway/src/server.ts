import Fastify, { type FastifyInstance } from 'fastify';
import { PrismaClient } from '@acg/database';
import { PluginRuntime, RuleEngine, Registry, AssetGraphEngine, EvidenceEngine } from '@acg/kernel';
import { promptRoute } from './routes/prompt.js';
import { moderationRoute } from './routes/moderation.js';
import { healthRoute } from './routes/health.js';
import { kernelRoute } from './routes/kernel.js';
import { createConnectors } from './connectors.js';
import { loadEnv } from './config/env.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { createApiKeyStore, createPrismaApiKeyStore, apiKeyAuth } from './middleware/api-key-auth.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { eventPublisher } from './middleware/event-publisher.js';
import { usageTracking } from './middleware/usage-tracker.js';
import { planEnforcement } from './middleware/plan-enforcement.js';
import pino from 'pino';

const env = loadEnv();
const logger = pino({ name: 'acg-gateway', level: env.LOG_LEVEL });

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: env.BODY_LIMIT,
  });

  // Initialize Prisma (PostgreSQL)
  const prisma = new PrismaClient({
    log: env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');
  } catch (err) {
    logger.warn(err, 'Failed to connect to PostgreSQL — falling back to in-memory store');
  }

  // Initialize kernel components
  const kernelRuntime = new PluginRuntime();
  const kernelRuleEngine = new RuleEngine();
  const kernelRegistry = new Registry();
  const kernelAssetGraph = new AssetGraphEngine();
  const kernelEvidenceEngine = new EvidenceEngine();
  logger.info('Kernel components initialized');

  const connectors = createConnectors();

  // Use PostgreSQL-backed API key store if connected, otherwise in-memory
  let apiKeyStore;
  try {
    await prisma.$queryRaw`SELECT 1`;
    apiKeyStore = createPrismaApiKeyStore(prisma);
    logger.info('Using PostgreSQL-backed API key store');
  } catch {
    apiKeyStore = createApiKeyStore();
    logger.warn('Using in-memory API key store (PostgreSQL unavailable)');
  }

  const authMiddleware = await apiKeyAuth(apiKeyStore);

  // Rate limiter
  const rateLimiter = createRateLimiter({
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    onBlock: (req, key, retryAfter) => {
      logger.warn({ key, retryAfter, url: req.url }, 'Rate limit exceeded');
    },
  });

  // Swagger
  await app.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'AI Compliance Gateway',
        description: 'Cloudflare for Enterprise AI — Single API endpoint for all LLM providers with built-in compliance, risk, and governance.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${env.GATEWAY_PORT}`, description: 'Local development' }],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Api-Key',
            description: 'API key for authentication',
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
      tags: [
        { name: 'Chat', description: 'Chat completion endpoints' },
        { name: 'Moderation', description: 'Content moderation endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
    },
  });

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
  });

  // CORS
  await app.register(import('@fastify/cors'), {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Organization-Id', 'X-Pipeline', 'X-Api-Key'],
    exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset', 'Retry-After'],
  });

  await app.register(errorHandler);
  await app.register(requestLogger);
  await app.register(eventPublisher);

  // Usage tracking (PostgreSQL-backed)
  await usageTracking(app, prisma);

  // Plan enforcement — checks subscription limits before LLM requests
  await planEnforcement(app, prisma);

  // Decorate app with connectors, API key store, prisma, and kernel
  app.decorate('connectors', connectors);
  app.decorate('apiKeyStore', apiKeyStore);
  app.decorate('prisma', prisma);
  app.decorate('kernel', {
    runtime: kernelRuntime,
    ruleEngine: kernelRuleEngine,
    registry: kernelRegistry,
    assetGraph: kernelAssetGraph,
    evidenceEngine: kernelEvidenceEngine,
  });

  // Health routes (no auth required)
  await app.register(healthRoute, { prefix: '/health' });

  // Kernel stats (no auth required)
  await app.register(kernelRoute, { prefix: '/kernel' });

  // Auth + rate limit on protected routes
  app.addHook('preHandler', async (request, reply) => {
    const url = request.url;
    if (url === '/' || url.startsWith('/health') || url === '/docs') return;

    if (url.startsWith('/v1/') || url.startsWith('/chat/completions') || url.startsWith('/moderations')) {
      await rateLimiter.handler(request, reply);
    }

    if (url.startsWith('/chat/completions') || url.startsWith('/moderations')) {
      await authMiddleware(request, reply);
    }
  });

  // API routes (with auth)
  await app.register(promptRoute);
  await app.register(moderationRoute);

  // Root route
  app.get('/', async () => ({
    name: 'AI Compliance Gateway',
    version: '0.1.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  }));

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    rateLimiter.close();
    try {
      await connectors.nats.disconnect?.();
      await connectors.redis.disconnect?.();
      await prisma.$disconnect();
      await app.close();
      logger.info('Server closed gracefully');
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return app;
}

const PORT = env.GATEWAY_PORT;
const HOST = env.GATEWAY_HOST;

buildApp()
  .then(async (app) => {
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Gateway listening on ${HOST}:${PORT}`);
    logger.info(`Rate limit: ${env.RATE_LIMIT_MAX} requests per ${env.RATE_LIMIT_WINDOW_MS}ms`);
    logger.info('Auth: X-Api-Key header required for /chat/completions and /moderations');
    logger.info('Pipeline: Client → Rate Limit → API Key Auth → Presidio → OPA → NeMo Guardrails → LiteLLM → Output Filter → Audit → Response');
  })
  .catch((err) => {
    logger.error(err, 'Failed to start gateway');
    process.exit(1);
  });
