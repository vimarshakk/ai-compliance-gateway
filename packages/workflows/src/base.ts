import type { EventBusConnector } from '@acg/connectors';

export interface WorkflowContext {
  requestId: string;
  organizationId: string;
  userId: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowStep<TInput, TOutput> {
  name: string;
  execute: (input: TInput, ctx: WorkflowContext) => Promise<TOutput>;
}

export abstract class Workflow<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly steps: WorkflowStep<unknown, unknown>[];

  constructor(protected eventBus: EventBusConnector) {}

  async run(input: TInput, ctx: WorkflowContext): Promise<TOutput> {
    await this.eventBus.publish(`${this.name}.started`, { requestId: ctx.requestId, workflow: this.name });

    let current: unknown = input;
    const results: unknown[] = [];

    for (const step of this.steps) {
      const start = Date.now();
      try {
        current = await step.execute(current, ctx);
        results.push({ step: step.name, status: 'ok', durationMs: Date.now() - start });
        await this.eventBus.publish(`${this.name}.${step.name}.completed`, { requestId: ctx.requestId, durationMs: Date.now() - start });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ step: step.name, status: 'error', error: message, durationMs: Date.now() - start });
        await this.eventBus.publish(`${this.name}.${step.name}.failed`, { requestId: ctx.requestId, error: message });
        throw error;
      }
    }

    await this.eventBus.publish(`${this.name}.completed`, { requestId: ctx.requestId, steps: results });
    return current as TOutput;
  }
}
