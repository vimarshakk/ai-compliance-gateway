import Fastify, { type FastifyInstance } from 'fastify';
import { promptRoute } from './routes/prompt.js';
import { moderationRoute } from './routes/moderation.js';
import { healthRoute } from './routes/health.js';
import { createConnectors } from './connectors.js';
import { loadEnv } from './config/env.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import pino from 'pino';

const env = loadEnv();
const logger = pino({ name: 'acg-gateway', level: env.LOG_LEVEL });

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: env.BODY_LIMIT,
  });

  const connectors = createConnectors();

  // Rate limiter
  const rateLimiter = createRateLimiter({
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    onBlock: (req, key, retryAfter) => {
      logger.warn({ key, retryAfter, url: req.url }, 'Rate limit exceeded');
    },
  });

  // Middleware
  await app.register(import('@fastify/cors'), {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Organization-Id', 'X-Pipeline', 'X-Api-Key'],
    exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset', 'Retry-After'],
  });

  await app.register(errorHandler);
  await app.register(requestLogger);

  // Decorate app with connectors
  app.decorate('connectors', connectors);

  // Routes
  await app.register(healthRoute, { prefix: '/health' });
  await app.register(promptRoute);
  await app.register(moderationRoute);

  // Apply rate limiter to /v1/* and /chat/completions routes
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/v1/') || request.url.startsWith('/chat/completions') || request.url.startsWith('/moderations')) {
      await rateLimiter.handler(request, reply);
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    rateLimiter.close();
    try {
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
    logger.info('Pipeline: Client → Rate Limit → Presidio → OPA → NeMo Guardrails → LiteLLM → Output Filter → Audit → Response');
  })
  .catch((err) => {
    logger.error(err, 'Failed to start gateway');
    process.exit(1);
  });
