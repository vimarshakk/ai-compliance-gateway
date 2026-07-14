import { Workflow, type WorkflowContext } from './base.js';
import type { EventBusConnector } from '@acg/connectors';
import type { AIRequest, LLMResponse } from '@acg/shared';
import { generateId } from '@acg/shared';

export interface RoutingDecision {
  requestId: string;
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  latencyMs: number;
}

export interface RoutingWorkflowInput {
  request: AIRequest;
  availableProviders: Array<{ provider: string; model: string; latencyMs: number; costPer1kTokens: number }>;
  policyDecisions: Array<{ action: string }>;
  compliancePack: string;
}

export class RoutingWorkflow extends Workflow<RoutingWorkflowInput, RoutingDecision> {
  readonly name = 'routing';
  readonly steps = [
    { name: 'check-compliance', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'evaluate-cost', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'select-provider', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
  ];

  constructor(eventBus: EventBusConnector) {
    super(eventBus);
  }

  async run(input: RoutingWorkflowInput, ctx: WorkflowContext): Promise<RoutingDecision> {
    const start = Date.now();
    await this.eventBus.publish('routing.started', { requestId: input.request.id });

    const denyDecisions = input.policyDecisions.filter((d) => d.action.includes('deny'));
    const allowed = input.availableProviders.filter((p) => {
      return !denyDecisions.some((d) => d.action.includes(p.provider));
    });

    const selected = allowed[0] ?? input.availableProviders[0];
    const decision: RoutingDecision = {
      requestId: input.request.id,
      selectedProvider: selected?.provider ?? 'openai',
      selectedModel: selected?.model ?? 'gpt-4',
      reason: denyDecisions.length > 0 ? `Filtered by policy - ${denyDecisions.length} providers denied` : 'Default selection',
      latencyMs: Date.now() - start,
    };

    await this.eventBus.publish('routing.completed', { requestId: input.request.id, provider: decision.selectedProvider, model: decision.selectedModel });
    return decision;
  }
}
