import type { FastifyRequest, FastifyReply } from 'fastify';
import { z, type ZodSchema } from 'zod';
import { ChatMessageSchema } from '@acg/contracts';

const GatewayChatCompletionSchema = z.object({
  model: z.string().min(1).optional().default('gpt-4'),
  messages: z.array(ChatMessageSchema).min(1),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  provider: z.string().optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  compliancePack: z.string().optional(),
  compliancePacks: z.array(z.string()).optional(),
  userRole: z.string().optional(),
  firewallEnabled: z.boolean().optional(),
  piiDetectionEnabled: z.boolean().optional(),
});

const GatewayModerationSchema = z.object({
  text: z.string().optional(),
  messages: z.array(ChatMessageSchema).optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  contentTypes: z.array(z.string()).optional(),
}).refine((data) => data.text || data.messages?.length, {
  message: 'text or messages is required',
});

export function requestValidator(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: {
          message: 'Request validation failed',
          type: 'invalid_request_error',
          code: 'VALIDATION_ERROR',
          details: result.error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
      });
    }
    // Replace body with parsed/validated data (applies defaults)
    (request as any).body = result.data as z.infer<typeof schema>;
  };
}

export const validateChatCompletion = requestValidator(GatewayChatCompletionSchema);
export const validateModeration = requestValidator(GatewayModerationSchema);

export type GatewayChatCompletion = z.infer<typeof GatewayChatCompletionSchema>;
export type GatewayModeration = z.infer<typeof GatewayModerationSchema>;
