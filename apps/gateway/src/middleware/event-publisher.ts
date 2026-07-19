import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateId } from '@acg/shared';

export async function eventPublisher(app: FastifyInstance) {
  const connectors = (app as any).connectors;
  if (!connectors?.nats) return;

  // Gateway started event
  connectors.nats.publish('gateway.started', {
    timestamp: new Date().toISOString(),
    port: process.env.GATEWAY_PORT ?? '3000',
    host: process.env.GATEWAY_HOST ?? '0.0.0.0',
  }).catch(() => {});

  // Request received/completed/failed
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any)._eventId = generateId();
    const url = request.url;
    // Skip health checks and static routes
    if (url === '/' || url.startsWith('/health') || url === '/docs') return;

    connectors.nats.publish('gateway.request.received', {
      eventId: (request as any)._eventId,
      method: request.method,
      url,
      ip: request.ip,
      organizationId: request.headers['x-organization-id'] ?? undefined,
      userId: request.headers['x-user-id'] ?? undefined,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url;
    if (url === '/' || url.startsWith('/health') || url === '/docs') return;

    const start = (request as any)._startTime as bigint | undefined;
    const durationMs = start ? Number(process.hrtime.bigint() - start) / 1e6 : 0;

    if (reply.statusCode >= 500) {
      connectors.nats.publish('gateway.request.failed', {
        eventId: (request as any)._eventId,
        method: request.method,
        url,
        statusCode: reply.statusCode,
        durationMs: Math.round(durationMs),
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    } else {
      connectors.nats.publish('gateway.request.completed', {
        eventId: (request as any)._eventId,
        method: request.method,
        url,
        statusCode: reply.statusCode,
        durationMs: Math.round(durationMs),
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }
  });

  // Graceful shutdown event
  const shutdown = async () => {
    connectors.nats.publish('gateway.stopped', {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }).catch(() => {});
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
