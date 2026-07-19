import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GatewayConnectors } from '../connectors.js';
import { generateId } from '@acg/shared';
import { validateModeration, type GatewayModeration } from '../middleware/request-validator.js';

export async function moderationRoute(app: FastifyInstance) {
  const connectors = (app as any).connectors as GatewayConnectors;

  app.post<{
    Body: GatewayModeration;
  }>('/moderations', {
    preHandler: [validateModeration],
    schema: {
      tags: ['Moderation'],
      summary: 'Moderate content',
      description: 'Analyze text for policy violations, harmful content, and compliance issues.',
      security: [{ ApiKeyAuth: [] }],
      body: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          messages: { type: 'array', items: { type: 'object' } },
          organizationId: { type: 'string' },
          userId: { type: 'string' },
          contentTypes: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: { description: 'Moderation result' },
        400: { description: 'Invalid request' },
        401: { description: 'Authentication error' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as GatewayModeration;
    const moderationId = generateId();
    const apiKeyRecord = (request as any).apiKeyRecord;

    const text = body.text ?? body.messages?.map((m: { role: string; content: string | null }) => m.content ?? '').join('\n') ?? '';
    const organizationId = body.organizationId ?? apiKeyRecord?.organizationId ?? 'anonymous';

    const ctx = {
      requestId: moderationId,
      organizationId,
      userId: body.userId ?? 'anonymous',
      metadata: {},
    };

    try {
      const { result } = await connectors.moderationWorkflow.run(
        {
          request: {
            id: moderationId,
            organizationId,
            userId: body.userId ?? 'anonymous',
            text,
            messages: body.messages?.map((m: { role: string; content: string | null }) => ({ role: m.role as any, content: m.content ?? '' })),
            contentTypes: body.contentTypes,
            timestamp: new Date(),
          },
        },
        ctx,
      );

      return reply.status(200).send(result);
    } catch (error) {
      app.log.error({ moderationId, error: (error as Error).message }, 'Moderation workflow failed');
      return reply.status(500).send({
        id: moderationId,
        error: { message: 'Internal server error', type: 'gateway_error', code: 'MODERATION_FAILED' },
      });
    }
  });
}
