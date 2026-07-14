import { Workflow, type WorkflowContext } from './base.js';
import type {
  LLMConnector, PIIDetectorConnector, PIIAnonymizerConnector,
  PolicyEngineConnector, GuardrailsConnector, TelemetryConnector,
  EventBusConnector,
} from '@acg/connectors';
import type { AIRequest, AIResponse, ChatMessage, PolicyDecision, PIIDetectionResult, FirewallResult, LLMProvider } from '@acg/shared';
import { generateId, sha256, immutableHash } from '@acg/shared';
import { AIRouter, createDefaultRouter, type RoutingDecision } from '@acg/ai-router';
import { RiskEngine, createDefaultRiskEngine, type RiskAssessment, type RiskContext } from '@acg/risk-engine';
import { GovernanceEngine, createDefaultGovernanceEngine, type GovernanceDecision, type ApprovalRequest } from '@acg/governance-engine';
import { ComplianceEngine, createDefaultComplianceEngine, type ComplianceReport } from '@acg/compliance-engine';

export interface EnhancedRequest extends AIRequest {
  compliancePacks?: string[];
  userRole?: string;
}

export interface EnhancedPromptWorkflowInput {
  request: EnhancedRequest;
}

export interface EnhancedPromptWorkflowOutput {
  response: AIResponse;
  auditEntry: {
    id: string;
    organizationId: string;
    projectId: string;
    userId: string;
    action: string;
    details: Record<string, unknown>;
    immutableHash: string;
  };
  engines: {
    routing?: RoutingDecision;
    risk?: RiskAssessment;
    governance?: GovernanceDecision[];
    compliance?: ComplianceReport[];
    approval?: ApprovalRequest;
  };
}

export class EnhancedPromptWorkflow extends Workflow<EnhancedPromptWorkflowInput, EnhancedPromptWorkflowOutput> {
  readonly name = 'enhanced_prompt';

  readonly steps = [
    { name: 'detect-pii', execute: async (input: unknown) => input },
    { name: 'evaluate-risk', execute: async (input: unknown) => input },
    { name: 'evaluate-governance', execute: async (input: unknown) => input },
    { name: 'evaluate-compliance', execute: async (input: unknown) => input },
    { name: 'route-model', execute: async (input: unknown) => input },
    { name: 'evaluate-policy', execute: async (input: unknown) => input },
    { name: 'check-firewall', execute: async (input: unknown) => input },
    { name: 'call-model', execute: async (input: unknown) => input },
    { name: 'filter-output', execute: async (input: unknown) => input },
  ];

  constructor(
    eventBus: EventBusConnector,
    private litellm: LLMConnector,
    private presidio: PIIDetectorConnector,
    private presidioAnon: PIIAnonymizerConnector,
    private opa: PolicyEngineConnector,
    private guardrails: GuardrailsConnector,
    private telemetry: TelemetryConnector,
    private router: AIRouter = createDefaultRouter(),
    private riskEngine: RiskEngine = createDefaultRiskEngine(),
    private governanceEngine: GovernanceEngine = createDefaultGovernanceEngine(),
    private complianceEngine: ComplianceEngine = createDefaultComplianceEngine(),
  ) {
    super(eventBus);
  }

  async run(input: EnhancedPromptWorkflowInput, ctx: WorkflowContext): Promise<EnhancedPromptWorkflowOutput> {
    const { request } = input;
    const promptText = request.messages.map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
    const compliancePacks = request.compliancePacks ?? [];
    const engineResults: EnhancedPromptWorkflowOutput['engines'] = {};

    // Step 1: PII Detection
    await this.eventBus.publish('prompt.pii_detecting', { requestId: request.id });
    const piiStart = Date.now();
    let piiResult: PIIDetectionResult | null = null;
    let promptForPolicy = promptText;

    try {
      const presidioResults = await this.presidio.analyze({
        text: promptText,
        entities: ['CREDIT_CARD', 'PHONE_NUMBER', 'EMAIL_ADDRESS', 'IP_ADDRESS', 'IBAN', 'MEDICAL_LICENSE', 'US_SSN'],
      });

      const entities = presidioResults.map((r) => ({
        type: r.entity_type,
        value: r.text,
        start: r.start,
        end: r.end,
        confidence: r.score,
        action: r.score > 0.8 ? 'redact' as const : 'allow' as const,
      }));

      piiResult = {
        containsPII: entities.length > 0,
        entities: entities as any,
        riskScore: Math.min(100, entities.length * 15),
        processingMs: Date.now() - piiStart,
      };

      if (piiResult.containsPII) {
        promptForPolicy = await this.presidioAnon.anonymize({
          text: promptText,
          analyzer_results: presidioResults,
          operator: 'replace',
        }).then((r) => r.text);
      }

      await this.eventBus.publish('prompt.pii_detected', { requestId: request.id, piiCount: entities.length, riskScore: piiResult.riskScore });
    } catch (error) {
      await this.eventBus.publish('prompt.pii_failed', { requestId: request.id, error: (error as Error).message });
      piiResult = { containsPII: false, entities: [], riskScore: 0, processingMs: Date.now() - piiStart };
    }

    // Step 2: Risk Assessment
    await this.eventBus.publish('prompt.risk_assessing', { requestId: request.id });
    const riskContext: RiskContext = {
      requestId: request.id,
      organizationId: request.organizationId,
      userId: request.userId,
      model: request.model ?? 'unknown',
      provider: (request.provider as string) ?? 'unknown',
      messages: request.messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
      piiEntities: (piiResult?.entities ?? []).map((e: any) => ({ type: e.type, confidence: e.confidence, value: e.value })),
      policyViolations: [],
      compliancePacks,
    };

    const riskAssessment = this.riskEngine.assess(riskContext);
    engineResults.risk = riskAssessment;
    await this.eventBus.publish('prompt.risk_assessed', {
      requestId: request.id,
      score: riskAssessment.compositeScore,
      level: riskAssessment.riskLevel,
      recommendation: riskAssessment.recommendation,
    });

    // Step 3: Governance Evaluation
    await this.eventBus.publish('prompt.governance_evaluating', { requestId: request.id });
    const governanceDecisions = this.governanceEngine.evaluate({
      requestId: request.id,
      organizationId: request.organizationId,
      projectId: request.projectId,
      userId: request.userId,
      userRole: request.userRole ?? 'viewer',
      model: request.model ?? 'unknown',
      provider: (request.provider as string) ?? 'unknown',
      messages: request.messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
      estimatedCost: 0,
      riskScore: riskAssessment.compositeScore,
      compliancePacks,
      timestamp: new Date(),
    });
    engineResults.governance = governanceDecisions;

    const approvalRequired = governanceDecisions.some((d) => d.action.type === 'require_approval');
    if (approvalRequired) {
      const approval = this.governanceEngine.requestApproval({
        requestId: request.id,
        organizationId: request.organizationId,
        projectId: request.projectId,
        userId: request.userId,
        userRole: request.userRole ?? 'viewer',
        model: request.model ?? 'unknown',
        provider: (request.provider as string) ?? 'unknown',
        messages: request.messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
        estimatedCost: 0,
        riskScore: riskAssessment.compositeScore,
        compliancePacks,
        timestamp: new Date(),
      }, governanceDecisions.filter((d) => d.action.type === 'require_approval').map((d) => d.reason));
      engineResults.approval = approval;
      await this.eventBus.publish('prompt.approval_required', { requestId: request.id, approvalId: approval.id });

      return {
        response: {
          id: generateId(),
          requestId: request.id,
          model: request.model ?? 'unknown',
          provider: (request.provider as LLMProvider) ?? 'openai',
          choices: [{ index: 0, message: { role: 'assistant', content: `Request pending approval. Approval ID: ${approval.id}` }, finishReason: 'content_filter' }],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cost: { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' },
          policyDecisions: [],
          piiResult: piiResult!,
          firewallResult: null,
          complianceEvals: [],
          latencyMs: 0,
          timestamp: new Date(),
        },
        auditEntry: {
          id: generateId(),
          organizationId: request.organizationId,
          projectId: request.projectId,
          userId: request.userId,
          action: 'request.pending_approval',
          details: { requestId: request.id, approvalId: approval.id, riskScore: riskAssessment.compositeScore },
          immutableHash: immutableHash({ requestId: request.id, action: 'pending_approval', timestamp: new Date().toISOString() }),
        },
        engines: engineResults,
      };
    }

    await this.eventBus.publish('prompt.governance_evaluated', { requestId: request.id, decisions: governanceDecisions.length });

    // Step 4: Compliance Evaluation
    if (compliancePacks.length > 0) {
      await this.eventBus.publish('prompt.compliance_evaluating', { requestId: request.id });
      const complianceReports = this.complianceEngine.evaluateAll({
        requestId: request.id,
        organizationId: request.organizationId,
        userId: request.userId,
        model: request.model ?? 'unknown',
        provider: (request.provider as string) ?? 'unknown',
        messages: request.messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
        piiDetected: (piiResult?.entities ?? []).map((e: any) => ({ type: e.type, value: e.value })),
        dataFlow: 'external',
        encryptionInTransit: true,
        encryptionAtRest: true,
        timestamp: new Date(),
      });
      engineResults.compliance = complianceReports;
      await this.eventBus.publish('prompt.compliance_evaluated', { requestId: request.id, reports: complianceReports.length });
    }

    // Step 5: AI Routing
    await this.eventBus.publish('prompt.routing', { requestId: request.id });
    let routingDecision: RoutingDecision | null = null;
    try {
      routingDecision = this.router.route({
        model: request.model,
        provider: request.provider as string,
        organizationId: request.organizationId,
        userId: request.userId,
        messages: request.messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
        compliancePacks,
        containsPII: piiResult?.containsPII ?? false,
        maxTokens: request.maxTokens,
        priority: 'normal',
      });
      engineResults.routing = routingDecision;
      request.model = routingDecision.selectedModel;
      request.provider = routingDecision.selectedProvider.id as LLMProvider;
      await this.eventBus.publish('prompt.routed', { requestId: request.id, provider: routingDecision.selectedProvider.name, model: routingDecision.selectedModel });
    } catch (error) {
      await this.eventBus.publish('prompt.routing_failed', { requestId: request.id, error: (error as Error).message });
    }

    // Step 6: Policy Evaluation via OPA
    await this.eventBus.publish('prompt.policy_evaluating', { requestId: request.id });
    const policyStart = Date.now();
    let policyDecisions: PolicyDecision[] = [];
    let blocked = riskAssessment.recommendation === 'block';
    let blockReason: string | null = riskAssessment.recommendation === 'block' ? riskAssessment.explanation : null;

    if (!blocked) {
      try {
        const opaResult = await this.opa.evaluate({
          input: {
            organization_id: request.organizationId,
            user_id: request.userId,
            model: request.model,
            provider: request.provider,
            prompt: promptForPolicy,
            contains_pii: piiResult?.containsPII ?? false,
            pii_types: piiResult?.entities.map((e: any) => e.type) ?? [],
            compliance_packs: compliancePacks,
            time: new Date().toISOString(),
          },
        });

        const result = opaResult.result as { allow: boolean; deny_reasons: string[]; routing?: { provider: string; model: string } };
        policyDecisions = (result.deny_reasons ?? []).map((reason, i) => ({
          policyId: `opa-${i}`,
          policyName: reason,
          action: { type: 'deny', reason },
          matched: true,
          evaluationMs: Date.now() - policyStart,
        }));

        if (!result.allow) {
          blocked = true;
          blockReason = result.deny_reasons?.[0] ?? 'Policy denied';
        }

        if (result.routing) {
          request.model = result.routing.model;
          request.provider = result.routing.provider as LLMProvider;
        }

        await this.eventBus.publish('prompt.policy_evaluated', { requestId: request.id, allow: result.allow, denyCount: policyDecisions.length });
      } catch (error) {
        await this.eventBus.publish('prompt.policy_failed', { requestId: request.id, error: (error as Error).message });
        policyDecisions = [{ policyId: 'fallback', policyName: 'default-allow', action: { type: 'allow' }, matched: true, evaluationMs: 0 }];
      }
    }

    // Step 7: Firewall Check
    let firewallResult: FirewallResult | null = null;
    if (!blocked) {
      await this.eventBus.publish('prompt.firewall_checking', { requestId: request.id });
      const firewallStart = Date.now();

      try {
        const guardrailsResult = await this.guardrails.check({
          messages: request.messages.map((m) => ({ role: m.role, content: m.content ?? '' })),
        });

        const triggered = (guardrailsResult.rails_output as any)?.input?.triggered ?? false;
        firewallResult = {
          passed: !triggered,
          checks: triggered ? [{ type: 'prompt_injection', passed: false, severity: 'high', message: 'NeMo Guardrails triggered', details: guardrailsResult.rails_output }] : [],
          riskLevel: triggered ? 'high' : 'low',
          blockedReason: triggered ? 'Prompt blocked by guardrails' : null,
          processingMs: Date.now() - firewallStart,
        };

        if (triggered) {
          blocked = true;
          blockReason = firewallResult.blockedReason;
        }

        await this.eventBus.publish('prompt.firewall_checked', { requestId: request.id, passed: firewallResult.passed });
      } catch (error) {
        await this.eventBus.publish('prompt.firewall_failed', { requestId: request.id, error: (error as Error).message });
        firewallResult = { passed: true, checks: [], riskLevel: 'low', blockedReason: null, processingMs: Date.now() - firewallStart };
      }
    }

    // Step 8: Model Call
    let responseId = generateId();
    let choices: AIResponse['choices'] = [];
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let cost = { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' };

    if (!blocked) {
      await this.eventBus.publish('prompt.model_calling', { requestId: request.id, model: request.model, provider: request.provider });
      const modelStart = Date.now();

      try {
        const llmResponse = await this.litellm.complete({
          model: request.model ?? 'gpt-4',
          messages: request.messages.map((m) => ({ role: m.role, content: m.content ?? '' })),
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        });

        responseId = llmResponse.id;
        choices = llmResponse.choices.map((c) => ({
          index: c.index,
          message: { role: c.message.role as ChatMessage['role'], content: c.message.content },
          finishReason: c.finish_reason,
        }));
        usage = {
          promptTokens: llmResponse.usage.prompt_tokens,
          completionTokens: llmResponse.usage.completion_tokens,
          totalTokens: llmResponse.usage.total_tokens,
        };

        if (routingDecision) {
          this.router.recordUsage(routingDecision.selectedProvider.id);
          this.router.recordSuccess(routingDecision.selectedProvider.id);
        }

        await this.eventBus.publish('prompt.model_completed', { requestId: request.id, latencyMs: Date.now() - modelStart, tokens: usage.totalTokens });
      } catch (error) {
        await this.eventBus.publish('prompt.model_failed', { requestId: request.id, error: (error as Error).message });
        if (routingDecision) this.router.recordFailure(routingDecision.selectedProvider.id);
        blocked = true;
        blockReason = `Model error: ${(error as Error).message}`;
      }
    }

    // Step 9: Output Filtering
    if (!blocked && choices.length > 0) {
      const outputText = choices[0].message.content;
      if (outputText) {
        try {
          const outputPII = await this.presidio.analyze({ text: outputText });
          if (outputPII.length > 0) {
            const anonymized = await this.presidioAnon.anonymize({ text: outputText, analyzer_results: outputPII, operator: 'replace' });
            choices[0].message.content = anonymized.text;
          }
        } catch { /* output PII check is best-effort */ }
      }
    }

    const latencyMs = Date.now() - new Date(request.timestamp).getTime();
    const response: AIResponse = {
      id: responseId,
      requestId: request.id,
      model: request.model ?? 'unknown',
      provider: (request.provider as LLMProvider) ?? 'openai',
      choices: blocked ? [{ index: 0, message: { role: 'assistant', content: `Request blocked: ${blockReason}` }, finishReason: 'content_filter' }] : choices,
      usage,
      cost,
      policyDecisions,
      piiResult,
      firewallResult,
      complianceEvals: [],
      latencyMs,
      timestamp: new Date(),
    };

    const auditEntry = {
      id: generateId(),
      organizationId: request.organizationId,
      projectId: request.projectId,
      userId: request.userId,
      action: blocked ? 'request.blocked' : 'request.completed',
      details: {
        requestId: request.id,
        model: response.model,
        provider: response.provider,
        promptHash: sha256(promptText),
        responseHash: blocked ? null : sha256(choices[0]?.message.content ?? ''),
        cost,
        tokens: usage,
        policyDecisions,
        piiResult,
        firewallResult,
        engines: {
          routing: engineResults.routing ? { provider: engineResults.routing.selectedProvider.name, model: engineResults.routing.selectedModel, reason: engineResults.routing.reason } : null,
          risk: engineResults.risk ? { score: engineResults.risk.compositeScore, level: engineResults.risk.riskLevel, recommendation: engineResults.risk.recommendation } : null,
          governance: engineResults.governance?.length ?? 0,
          compliance: engineResults.compliance?.map((r) => ({ pack: r.packName, status: r.overallStatus, score: r.score })) ?? [],
        },
        latencyMs,
        error: blockReason,
      },
      immutableHash: immutableHash({ requestId: request.id, action: blocked ? 'blocked' : 'completed', timestamp: new Date().toISOString() }),
    };

    await this.eventBus.publish('prompt.completed', { requestId: request.id, blocked, latencyMs });
    return { response, auditEntry, engines: engineResults };
  }
}
