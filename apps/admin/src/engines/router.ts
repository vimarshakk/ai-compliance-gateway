import type { FastifyInstance } from 'fastify';
import { getRouter } from './registry.js';

export async function registerRouterRoutes(app: FastifyInstance) {
  app.get('/providers', async (_request, reply) => {
    const router = getRouter();
    const health = router.getProviderHealth();
    return reply.send({ providers: health, total: health.length });
  });

  app.get('/providers/:id', async (request, reply) => {
    const router = getRouter();
    const health = router.getProviderHealth();
    const provider = health.find((p) => p.provider.toLowerCase() === (request.params as any).id.toLowerCase());
    if (!provider) return reply.status(404).send({ error: 'Provider not found' });
    return reply.send(provider);
  });

  app.get('/health', async (_request, reply) => {
    const router = getRouter();
    const health = router.getProviderHealth();
    const healthy = health.filter((p) => p.healthy).length;
    return reply.send({
      status: healthy === health.length ? 'healthy' : 'degraded',
      providers: health,
      healthy,
      total: health.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/reset-circuit-breakers', async (_request, reply) => {
    const router = getRouter();
    const health = router.getProviderHealth();
    for (const p of health) {
      if (!p.healthy) {
        for (let i = 0; i < p.failureCount; i++) {
          router.recordSuccess(p.provider);
        }
      }
    }
    return reply.send({ message: 'Circuit breakers reset', timestamp: new Date().toISOString() });
  });
}
