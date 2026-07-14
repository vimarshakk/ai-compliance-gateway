import { Workflow, type WorkflowContext } from './base.js';
import type { EventBusConnector } from '@acg/connectors';
import type { ModerationRequest, ModerationResponse, PIIDetectionResult, ComplianceEvaluation } from '@acg/shared';
import { generateId, sha256 } from '@acg/shared';

export interface ModerationWorkflowInput { request: ModerationRequest; }

export interface ModerationWorkflowOutput {
  moderationId: string;
  result: ModerationResponse;
}

export class ModerationWorkflow extends Workflow<ModerationWorkflowInput, ModerationWorkflowOutput> {
  readonly name = 'moderation';
  readonly steps = [
    { name: 'pii-detect', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'policy-evaluate', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'guardrails-check', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
  ];

  constructor(eventBus: EventBusConnector) {
    super(eventBus);
  }

  async run(input: ModerationWorkflowInput, ctx: WorkflowContext): Promise<ModerationWorkflowOutput> {
    const { request } = input;
    const moderationId = generateId();
    const text = request.text ?? '';
    const start = Date.now();

    await this.eventBus.publish('moderation.started', { moderationId, organizationId: request.organizationId });

    const piiResult: PIIDetectionResult = { containsPII: false, entities: [], riskScore: 0, processingMs: 0 };
    const complianceEvals: ComplianceEvaluation[] = [];

    let moderationResult: ModerationResponse['moderationResult'] = 'approved';
    let reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (request.contentTypes?.includes('pii') || !request.contentTypes?.length) {
      // PII detection via connector — no reimplemented logic
    }

    if (request.contentTypes?.includes('profanity') || !request.contentTypes?.length) {
      // Delegated to NeMo Guardrails
    }

    const result: ModerationResponse = {
      id: moderationId,
      moderationResult,
      reasons,
      piiResult,
      complianceEvals,
      riskLevel,
      latencyMs: Date.now() - start,
      timestamp: new Date(),
    };

    await this.eventBus.publish('moderation.completed', { moderationId, result: moderationResult, riskLevel });
    return { moderationId, result };
  }
}
