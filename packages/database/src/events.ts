export type EventType =
  // Gateway lifecycle
  | 'gateway.started'
  | 'gateway.stopped'
  | 'gateway.request.received'
  | 'gateway.request.completed'
  | 'gateway.request.failed'
  // Prompt workflow
  | 'prompt.started'
  | 'prompt.pii_detecting'
  | 'prompt.pii_detected'
  | 'prompt.pii_failed'
  | 'prompt.policy_evaluating'
  | 'prompt.policy_evaluated'
  | 'prompt.policy_failed'
  | 'prompt.firewall_checking'
  | 'prompt.firewall_checked'
  | 'prompt.firewall_failed'
  | 'prompt.model_calling'
  | 'prompt.model_completed'
  | 'prompt.model_failed'
  | 'prompt.output_filtering'
  | 'prompt.output_filtered'
  | 'prompt.completed'
  | 'prompt.blocked'
  // Moderation
  | 'moderation.started'
  | 'moderation.completed'
  | 'moderation.flagged'
  | 'moderation.failed'
  // Routing
  | 'routing.started'
  | 'routing.resolved'
  | 'routing.fallback'
  | 'routing.failed'
  // Evaluation
  | 'evaluation.started'
  | 'evaluation.completed'
  | 'evaluation.cost_analyzed'
  | 'evaluation.failed'
  // Auth
  | 'auth.api_key.validated'
  | 'auth.api_key.invalid'
  | 'auth.api_key.expired'
  | 'auth.jwt.validated'
  | 'auth.jwt.invalid'
  // Policy
  | 'policy.created'
  | 'policy.updated'
  | 'policy.deleted'
  | 'policy.toggled'
  // Organization
  | 'org.created'
  | 'org.updated'
  // Project
  | 'project.created'
  | 'project.updated'
  // Compliance
  | 'compliance.pack_applied'
  | 'compliance.violation_detected'
  | 'compliance.report_generated'
  // Usage
  | 'usage.recorded'
  | 'usage.limit_reached';

export interface DomainEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
  metadata?: {
    organizationId?: string;
    projectId?: string;
    userId?: string;
    requestId?: string;
    correlationId?: string;
  };
}

export const ALL_EVENT_TYPES: EventType[] = [
  'gateway.started', 'gateway.stopped', 'gateway.request.received',
  'gateway.request.completed', 'gateway.request.failed',
  'prompt.started', 'prompt.pii_detecting', 'prompt.pii_detected',
  'prompt.pii_failed', 'prompt.policy_evaluating', 'prompt.policy_evaluated',
  'prompt.policy_failed', 'prompt.firewall_checking', 'prompt.firewall_checked',
  'prompt.firewall_failed', 'prompt.model_calling', 'prompt.model_completed',
  'prompt.model_failed', 'prompt.output_filtering', 'prompt.output_filtered',
  'prompt.completed', 'prompt.blocked',
  'moderation.started', 'moderation.completed', 'moderation.flagged', 'moderation.failed',
  'routing.started', 'routing.resolved', 'routing.fallback', 'routing.failed',
  'evaluation.started', 'evaluation.completed', 'evaluation.cost_analyzed', 'evaluation.failed',
  'auth.api_key.validated', 'auth.api_key.invalid', 'auth.api_key.expired',
  'auth.jwt.validated', 'auth.jwt.invalid',
  'policy.created', 'policy.updated', 'policy.deleted', 'policy.toggled',
  'org.created', 'org.updated',
  'project.created', 'project.updated',
  'compliance.pack_applied', 'compliance.violation_detected', 'compliance.report_generated',
  'usage.recorded', 'usage.limit_reached',
];
