import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function requestLogger(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any)._startTime = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const start = (request as any)._startTime as bigint;
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6;

    const logData = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      requestId: request.headers['x-request-id'] ?? undefined,
      organizationId: request.headers['x-organization-id'] ?? undefined,
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? undefined,
      contentLength: reply.getHeader('content-length') ?? undefined,
    };

    if (reply.statusCode >= 500) {
      app.log.error(logData, 'request completed');
    } else if (reply.statusCode >= 400) {
      app.log.warn(logData, 'request completed');
    } else {
      app.log.info(logData, 'request completed');
    }
  });
}
