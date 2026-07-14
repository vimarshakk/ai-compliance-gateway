import type { FastifyInstance } from 'fastify';
import type { GatewayConnectors } from '../connectors.js';

interface ServiceCheck {
  name: string;
  url: string;
  check: () => Promise<boolean>;
}

export async function healthRoute(app: FastifyInstance) {
  const connectors = (app as any).connectors as GatewayConnectors;

  app.get('/', async (request, reply) => {
    const services: Record<string, { status: string; latencyMs?: number }> = {};

    const checks: ServiceCheck[] = [
      { name: 'litellm', url: connectors.litellm.baseUrl, check: () => connectors.litellm.healthCheck() },
      { name: 'opa', url: connectors.opa.baseUrl, check: () => connectors.opa.healthCheck() },
      { name: 'guardrails', url: connectors.guardrails.baseUrl, check: () => connectors.guardrails.healthCheck() },
      { name: 'presidio-analyzer', url: connectors.presidioAnalyzer.baseUrl, check: () => connectors.presidioAnalyzer.healthCheck() },
      { name: 'presidio-anonymizer', url: connectors.presidioAnonymizer.baseUrl, check: () => connectors.presidioAnonymizer.healthCheck() },
    ];

    const results = await Promise.allSettled(
      checks.map(async (c) => {
        const start = Date.now();
        try {
          const ok = await c.check();
          return { name: c.name, status: ok ? 'healthy' : 'unhealthy', latencyMs: Date.now() - start, url: c.url };
        } catch {
          return { name: c.name, status: 'unreachable', latencyMs: Date.now() - start, url: c.url };
        }
      }),
    );

    let healthyCount = 0;
    let totalCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, status, latencyMs, url } = result.value;
        services[name] = { status, latencyMs };
        totalCount++;
        if (status === 'healthy') healthyCount++;
      }
    }

    const overall = healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy';

    return reply.status(overall === 'unhealthy' ? 503 : 200).send({
      status: overall,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime(),
      services,
      summary: { healthy: healthyCount, total: totalCount },
    });
  });

  app.get('/live', async () => ({ status: 'alive', timestamp: new Date().toISOString() }));

  app.get('/ready', async (request, reply) => {
    const checks = await Promise.allSettled([
      connectors.litellm.healthCheck(),
      connectors.opa.healthCheck(),
    ]);

    const ready = checks.every((r) => r.status === 'fulfilled' && r.value === true);

    return reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    });
  });
}
