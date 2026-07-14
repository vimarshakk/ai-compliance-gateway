import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GatewayConnectors } from '../connectors.js';
import { generateId } from '@acg/shared';
import type { ChatMessage } from '@acg/shared';

export async function promptRoute(app: FastifyInstance) {
  const connectors = (app as any).connectors as GatewayConnectors;

  app.post<{
    Body: {
      model?: string;
      provider?: string;
      messages: Array<{ role: string; content: string }>;
      organizationId?: string;
      userId?: string;
      projectId?: string;
      temperature?: number;
      maxTokens?: number;
      compliancePack?: string;
      compliancePacks?: string[];
      userRole?: string;
      firewallEnabled?: boolean;
      piiDetectionEnabled?: boolean;
      stream?: boolean;
    };
  }>('/chat/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const requestId = request.headers['x-request-id'] as string ?? generateId();

    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return reply.status(400).send({
        error: { message: 'messages is required and must be a non-empty array', type: 'invalid_request_error', code: 'MISSING_MESSAGES' },
      });
    }

    const compliancePacks = body.compliancePacks ?? (body.compliancePack ? [body.compliancePack] : []);
    const useEnhanced = request.headers['x-pipeline'] === 'enhanced';

    const aiRequest: any = {
      id: requestId,
      organizationId: body.organizationId ?? 'anonymous',
      projectId: body.projectId ?? 'default',
      userId: body.userId ?? 'anonymous',
      apiKeyId: body.apiKeyId ?? 'anonymous',
      model: body.model ?? 'gpt-4',
      provider: body.provider ?? 'openai',
      messages: body.messages.map((m: any) => ({
        role: m.role as ChatMessage['role'],
        content: m.content ?? '',
      })) as ChatMessage[],
      stream: body.stream ?? false,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      metadata: {
        compliancePack: body.compliancePack,
        compliancePacks,
        firewallEnabled: body.firewallEnabled ?? true,
        piiDetectionEnabled: body.piiDetectionEnabled ?? true,
      },
      timestamp: new Date(),
    };

    const ctx = {
      requestId,
      organizationId: aiRequest.organizationId,
      userId: aiRequest.userId,
      metadata: aiRequest.metadata,
    };

    try {
      let result: any;
      if (useEnhanced) {
        aiRequest.compliancePacks = compliancePacks;
        aiRequest.userRole = body.userRole;
        result = await connectors.enhancedWorkflow.run({ request: aiRequest }, ctx);
      } else {
        result = await connectors.promptWorkflow.run({ request: aiRequest }, ctx);
      }

      const { response, auditEntry } = result;

      connectors.nats.publish('audit.prompt', auditEntry).catch(() => {});

      return reply.status(200).send({
        ...response,
        x_request_id: requestId,
        x_organization_id: aiRequest.organizationId,
      });
    } catch (error) {
      app.log.error({ requestId, error: (error as Error).message }, 'Prompt workflow failed');
      return reply.status(500).send({
        id: requestId,
        error: { message: 'Internal server error', type: 'gateway_error', code: 'WORKFLOW_FAILED' },
      });
    }
  });

  // Models endpoint — proxy to LiteLLM
  app.get('/models', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const models = await connectors.litellm.getModels();
      return reply.send(models);
    } catch {
      return reply.send({ data: [] });
    }
  });

  // Health check for the gateway itself
  app.get('/health', async () => {
    const services: Record<string, boolean> = {};
    const checks = await Promise.allSettled([
      connectors.litellm.healthCheck().then((ok) => { services.litellm = ok; }),
      connectors.opa.healthCheck().then((ok) => { services.opa = ok; }),
      connectors.guardrails.healthCheck().then((ok) => { services.guardrails = ok; }),
    ]);
    const healthy = Object.values(services).some((v) => v);
    return { status: healthy ? 'healthy' : 'degraded', services, timestamp: new Date().toISOString() };
  });
}
