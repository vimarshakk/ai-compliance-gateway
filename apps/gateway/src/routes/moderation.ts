import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GatewayConnectors } from '../connectors.js';
import { generateId } from '@acg/shared';

export async function moderationRoute(app: FastifyInstance) {
  const connectors = (app as any).connectors as GatewayConnectors;

  app.post<{
    Body: {
      text?: string;
      messages?: Array<{ role: string; content: string }>;
      organizationId?: string;
      userId?: string;
      contentTypes?: string[];
    };
  }>('/moderations', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const moderationId = generateId();

    const text = body.text ?? body.messages?.map((m: any) => m.content).join('\n') ?? '';

    if (!text) {
      return reply.status(400).send({
        error: { message: 'text or messages is required', type: 'invalid_request_error' },
      });
    }

    const ctx = {
      requestId: moderationId,
      organizationId: body.organizationId ?? 'anonymous',
      userId: body.userId ?? 'anonymous',
      metadata: {},
    };

    try {
      const { result } = await connectors.moderationWorkflow.run(
        {
          request: {
            id: moderationId,
            organizationId: body.organizationId ?? 'anonymous',
            userId: body.userId ?? 'anonymous',
            text,
            messages: body.messages?.map((m: any) => ({ role: m.role as any, content: m.content })),
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
