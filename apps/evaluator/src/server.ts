import Fastify, { type FastifyInstance } from 'fastify';
import pino from 'pino';
import { registerEvaluationRoutes } from './routes/evaluations.js';

const logger = pino({ name: 'acg-evaluator', level: process.env.LOG_LEVEL ?? 'info' });

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy: true });

  await app.register(import('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['*'],
    methods: ['GET', 'POST'],
  });

  app.get('/health', async () => ({ status: 'healthy', service: 'evaluator', timestamp: new Date().toISOString() }));

  await registerEvaluationRoutes(app);

  return app;
}

const PORT = parseInt(process.env.EVALUATOR_PORT ?? '3003', 10);
const HOST = process.env.EVALUATOR_HOST ?? '0.0.0.0';

buildApp()
  .then(async (app) => {
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Evaluator listening on ${HOST}:${PORT}`);
  })
  .catch((err) => {
    logger.error(err, 'Failed to start evaluator');
    process.exit(1);
  });
