import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { emitAuditLog } from '../v1/audit-logs.js';

export function registerAuditHooks(app: FastifyInstance) {
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    const url = request.url;

    const orgId = (request as FastifyRequest & { orgId?: string }).orgId;

    if (orgId && method !== 'GET' && !url.includes('/health')) {
      try {
        await emitAuditLog({
          organizationId: orgId,
          action: `${method.toLowerCase()}`,
          resource: url.split('/').slice(0, 4).join('/'),
          details: {
            method,
            url,
            statusCode: reply.statusCode,
            ip: request.ip,
          },
          riskScore: reply.statusCode >= 500 ? 80 : reply.statusCode >= 400 ? 40 : 0,
        });
      } catch {
        // Don't fail requests if audit logging fails
      }
    }
  });
}
