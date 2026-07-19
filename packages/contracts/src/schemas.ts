import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function', 'tool']),
  content: z.string().nullable(),
  name: z.string().optional(),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  provider: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional().default('free'),
});

export const CreateProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  environment: z.enum(['development', 'staging', 'production']).optional().default('development'),
});

export const CreateApiKeySchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).optional().default(['*']),
  expiresInDays: z.number().int().positive().optional(),
});

export const CreatePolicySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['access-control', 'data-classification', 'model-routing', 'pii-handling', 'content-filter', 'compliance', 'custom']),
  enabled: z.boolean().optional().default(true),
  priority: z.number().int().min(0).max(1000).optional().default(100),
  regoPolicy: z.string().min(1),
  compliancePack: z.enum(['dpdp', 'hipaa', 'gdpr', 'soc2', 'iso27001', 'rbi', 'irdai', 'sebi', 'pci_dss', 'nist_ai_rmf']).optional(),
});

export const ActivateCompliancePackSchema = z.object({
  organizationId: z.string().uuid(),
  pack: z.enum(['dpdp', 'hipaa', 'gdpr', 'soc2', 'iso27001', 'rbi', 'irdai', 'sebi', 'pci_dss', 'nist_ai_rmf']),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const AuditLogQuerySchema = PaginationSchema.extend({
  organizationId: z.string().uuid(),
  action: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
export type CreatePolicy = z.infer<typeof CreatePolicySchema>;
export type ActivateCompliancePack = z.infer<typeof ActivateCompliancePackSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
