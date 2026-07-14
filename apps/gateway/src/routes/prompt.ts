import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { GatewayConnectors } from '../connectors.js';
import { generateId } from '@acg/shared';
import type { ChatMessage } from '@acg/shared';
import { validateChatCompletion, type GatewayChatCompletion } from '../middleware/request-validator.js';

export async function promptRoute(app: FastifyInstance) {
  const connectors = (app as any).connectors as GatewayConnectors;

  app.post<{
    Body: GatewayChatCompletion;
  }>('/chat/completions', {
    preHandler: [validateChatCompletion],
    schema: {
      tags: ['Chat'],
      summary: 'Create a chat completion',
      description: 'Proxy to LLM providers with built-in PII detection, risk assessment, policy evaluation, and compliance checks. Set X-Pipeline: enhanced header to activate all 4 engines. Supports SSE streaming with stream: true.',
      security: [{ ApiKeyAuth: [] }],
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          model: { type: 'string', default: 'gpt-4', description: 'Model to use' },
          messages: { type: 'array', minItems: 1, items: { type: 'object', properties: { role: { type: 'string', enum: ['system', 'user', 'assistant'] }, content: { type: 'string' } } } },
          stream: { type: 'boolean', default: false },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          maxTokens: { type: 'integer', minimum: 1 },
          provider: { type: 'string' },
          organizationId: { type: 'string' },
          userId: { type: 'string' },
          compliancePack: { type: 'string' },
          compliancePacks: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: { description: 'Chat completion response' },
        400: { description: 'Invalid request' },
        401: { description: 'Authentication error' },
        429: { description: 'Rate limit exceeded' },
        500: { description: 'Server error' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as GatewayChatCompletion;
    const requestId = request.headers['x-request-id'] as string ?? generateId();
    const apiKeyRecord = (request as any).apiKeyRecord;
    const isStreaming = body.stream === true;

    const organizationId = body.organizationId ?? apiKeyRecord?.organizationId ?? 'anonymous';
    const userId = body.userId ?? 'anonymous';
    const projectId = body.projectId ?? apiKeyRecord?.projectId ?? 'default';

    const compliancePacks = body.compliancePacks ?? (body.compliancePack ? [body.compliancePack] : []);
    const useEnhanced = request.headers['x-pipeline'] === 'enhanced';

    const aiRequest: any = {
      id: requestId,
      organizationId,
      projectId,
      userId,
      apiKeyId: apiKeyRecord?.key ?? 'anonymous',
      model: body.model,
      provider: body.provider ?? 'openai',
      messages: body.messages.map((m: { role: string; content: string | null }) => ({
        role: m.role as ChatMessage['role'],
        content: m.content ?? '',
      })) as ChatMessage[],
      stream: isStreaming,
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
      // Run pre-checks for enhanced pipeline
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

      // Non-streaming response
      if (!isStreaming) {
        return reply.status(200).send({
          ...response,
          x_request_id: requestId,
          x_organization_id: organizationId,
        });
      }

      // Streaming response (SSE)
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': requestId,
        'X-Organization-Id': organizationId,
      });

      const responseId = response.id ?? generateId();
      const model = response.model ?? body.model ?? 'gpt-4';

      // If the request was blocked, send a single chunk with the block message
      if (response.choices?.[0]?.finishReason === 'content_filter') {
        const chunk = {
          id: responseId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            delta: { role: 'assistant', content: response.choices[0].message.content },
            finish_reason: 'stop',
          }],
        };
        reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
        return;
      }

      // Stream from LLM
      try {
        for await (const token of connectors.litellm.stream({
          model,
          messages: aiRequest.messages.map((m: ChatMessage) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
          temperature: body.temperature,
          maxTokens: body.maxTokens,
        })) {
          const chunk = {
            id: token.id ?? responseId,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{
              index: 0,
              delta: token.chunk ? { content: token.chunk } : {},
              finish_reason: token.finishReason,
            }],
          };
          reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      } catch (streamError) {
        app.log.error({ requestId, error: (streamError as Error).message }, 'Stream failed');
        const errorChunk = {
          id: responseId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{
            index: 0,
            delta: { content: '' },
            finish_reason: 'stop',
          }],
        };
        reply.raw.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    } catch (error) {
      app.log.error({ requestId, error: (error as Error).message }, 'Prompt workflow failed');
      if (isStreaming) {
        reply.raw.writeHead(500, { 'Content-Type': 'text/event-stream' });
        reply.raw.write(`data: ${JSON.stringify({ error: { message: 'Internal server error', type: 'gateway_error', code: 'WORKFLOW_FAILED' } })}\n\n`);
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
        return;
      }
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
}
