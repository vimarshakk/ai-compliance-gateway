import { Workflow, type WorkflowContext } from './base.js';
import type {
  PIIDetectorConnector, PIIAnonymizerConnector,
  PolicyEngineConnector, GuardrailsConnector,
  EventBusConnector,
} from '@acg/connectors';
import type { ModerationRequest, ModerationResponse, PIIDetectionResult, ComplianceEvaluation } from '@acg/shared';
import { generateId } from '@acg/shared';

export interface ModerationWorkflowInput { request: ModerationRequest; }

export interface ModerationWorkflowOutput {
  moderationId: string;
  result: ModerationResponse;
}

export class ModerationWorkflow extends Workflow<ModerationWorkflowInput, ModerationWorkflowOutput> {
  readonly name = 'moderation';

  readonly steps = [
    { name: 'pii-detect', execute: async (input: unknown) => input },
    { name: 'policy-evaluate', execute: async (input: unknown) => input },
    { name: 'guardrails-check', execute: async (input: unknown) => input },
  ];

  constructor(
    eventBus: EventBusConnector,
    private presidio: PIIDetectorConnector,
    private presidioAnon: PIIAnonymizerConnector,
    private opa: PolicyEngineConnector,
    private guardrails: GuardrailsConnector,
  ) {
    super(eventBus);
  }

  async run(input: ModerationWorkflowInput, ctx: WorkflowContext): Promise<ModerationWorkflowOutput> {
    const { request } = input;
    const moderationId = generateId();
    const text = request.text ?? '';
    const messages = request.messages ?? [{ role: 'user' as const, content: text }];
    const start = Date.now();

    await this.eventBus.publish('moderation.started', {
      moderationId,
      organizationId: request.organizationId,
      userId: request.userId,
    });

    let piiResult: PIIDetectionResult = { containsPII: false, entities: [], riskScore: 0, processingMs: 0 };
    let complianceEvals: ComplianceEvaluation[] = [];
    let moderationResult: ModerationResponse['moderationResult'] = 'approved';
    let reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Step 1: PII Detection via Presidio
    if (request.contentTypes?.includes('pii') || !request.contentTypes?.length) {
      try {
        const piiStart = Date.now();
        const presidioResults = await this.presidio.analyze({
          text,
          entities: ['CREDIT_CARD', 'PHONE_NUMBER', 'EMAIL_ADDRESS', 'IP_ADDRESS', 'IBAN', 'MEDICAL_LICENSE', 'US_SSN'],
          language: 'en',
          scoreThreshold: 0.5,
        });

        piiResult = {
          containsPII: presidioResults.length > 0,
          entities: presidioResults.map((r: any) => ({
            type: (r.entity_type ?? 'UNKNOWN') as any,
            value: text.substring(r.start ?? 0, r.end ?? 0),
            confidence: r.score ?? 0,
            start: r.start ?? 0,
            end: r.end ?? 0,
            action: 'redact' as const,
          })),
          riskScore: Math.min(1.0, presidioResults.reduce((max: number, r: any) => Math.max(max, r.score ?? 0), 0)),
          processingMs: Date.now() - piiStart,
        };

        if (piiResult.containsPII) {
          moderationResult = 'flagged';
          reasons.push(`PII detected: ${piiResult.entities.map(e => e.type).join(', ')}`);
          riskLevel = piiResult.riskScore > 0.8 ? 'critical' : piiResult.riskScore > 0.5 ? 'high' : 'medium';
        }
      } catch (err) {
        // Presidio unavailable — PII detection skipped, risk level elevated
        riskLevel = 'medium';
        reasons.push('PII detection unavailable (Presidio)');
      }
    }

    // Step 2: Policy Evaluation via OPA
    const policyInput = {
      organizationId: request.organizationId,
      userId: request.userId,
      text,
      containsPII: piiResult.containsPII,
      contentTypes: request.contentTypes ?? ['pii', 'profanity'],
    };

    try {
      const policyResult = await this.opa.evaluate({ input: policyInput }) as any;
      const policyData = policyResult?.result ?? policyResult;

      if (policyData?.allow === false) {
        moderationResult = 'rejected';
        reasons.push(...(policyData.deny_reasons ?? ['Policy violation']));
        riskLevel = 'high';
      }

      complianceEvals.push({
        pack: 'soc2' as const,
        passed: policyData?.allow !== false,
        violations: (policyData?.deny_reasons ?? []).map((msg: string) => ({
          pack: 'soc2' as const,
          requirement: 'opa-policy',
          severity: 'high' as const,
          message: msg,
          remediation: 'Review OPA policy configuration',
        })),
      });
    } catch (err) {
      // OPA unavailable — fail closed (deny)
      moderationResult = 'rejected';
      reasons.push('Policy engine unavailable (OPA) — denied for safety');
      riskLevel = 'critical';
    }

    // Step 3: Content Guardrails via NeMo
    if (request.contentTypes?.includes('profanity') || !request.contentTypes?.length) {
      try {
        const guardrailsResult = await this.guardrails.check({ messages });
        const railsOutput = (guardrailsResult as any)?.rails_output;
        const inputTriggered = railsOutput?.input?.triggered ?? false;
        const outputTriggered = railsOutput?.output?.triggered ?? false;

        if (inputTriggered || outputTriggered) {
          moderationResult = moderationResult === 'approved' ? 'rejected' : moderationResult;
          reasons.push('Content guardrails triggered (NeMo)');
          riskLevel = riskLevel === 'low' ? 'high' : riskLevel;
        }

        complianceEvals.push({
          pack: 'soc2' as const,
          passed: !inputTriggered && !outputTriggered,
          violations: (inputTriggered ? ['Input guardrails triggered'] : outputTriggered ? ['Output guardrails triggered'] : []).map((msg: string) => ({
            pack: 'soc2' as const,
            requirement: 'content-guardrails',
            severity: 'high' as const,
            message: msg,
            remediation: 'Review NeMo Guardrails configuration',
          })),
        });
      } catch (err) {
        // NeMo unavailable — fail closed (block)
        moderationResult = moderationResult === 'approved' ? 'rejected' : moderationResult;
        reasons.push('Guardrails service unavailable (NeMo) — blocked for safety');
        riskLevel = 'critical';
      }
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

    await this.eventBus.publish('moderation.completed', {
      moderationId,
      result: moderationResult,
      riskLevel,
      organizationId: request.organizationId,
      reasons,
    });

    return { moderationId, result };
  }
}
