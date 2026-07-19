import { Workflow, type WorkflowContext } from './base.js';
import type { EventBusConnector } from '@acg/connectors';
import { generateId } from '@acg/shared';

export interface EvaluationWorkflowInput {
  prompt: string;
  expectedOutput?: string;
  model: string;
  provider: string;
  compliancePack?: string;
  metrics: string[];
}

export interface EvaluationWorkflowOutput {
  evalId: string;
  promptScore: number;
  hallucinationScore: number;
  costEstimate: number;
  latencyMs: number;
  complianceScore: number;
}

export class EvaluationWorkflow extends Workflow<EvaluationWorkflowInput, EvaluationWorkflowOutput> {
  readonly name = 'evaluation';
  readonly steps = [
    { name: 'run-prompt', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'score-output', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'check-compliance', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
    { name: 'calculate-cost', execute: async (input: any, ctx: WorkflowContext) => { return input; } },
  ];

  constructor(eventBus: EventBusConnector) {
    super(eventBus);
  }

  async run(input: EvaluationWorkflowInput, ctx: WorkflowContext): Promise<EvaluationWorkflowOutput> {
    const start = Date.now();
    const evalId = generateId();

    await this.eventBus.publish('evaluation.started', { evalId, model: input.model });

    const output: EvaluationWorkflowOutput = {
      evalId,
      promptScore: 0,
      hallucinationScore: 0,
      costEstimate: 0,
      latencyMs: Date.now() - start,
      complianceScore: 0,
    };

    await this.eventBus.publish('evaluation.completed', { evalId, promptScore: output.promptScore });
    return output;
  }
}
