// ============================================================
// @acg/kernel — Pipeline Runner
// ============================================================
// Orchestrates engine execution through the AI request pipeline.
// Engines are executed in priority order, with fail-closed
// semantics by default.
// ============================================================

import type {
  Engine,
  EngineInput,
  EngineOutput,
  PipelineConfig,
  PipelineResult,
  PipelineStage,
} from './engine-types.js';
import type { Evidence } from './types.js';

// ---- Pipeline Runner ----

export class PipelineRunner {
  private engines: Engine[] = [];
  private config: Required<PipelineConfig>;

  constructor(config: PipelineConfig) {
    this.config = {
      engines: config.engines,
      timeout: config.timeout ?? 30_000,
      continueOnFailure: config.continueOnFailure ?? false,
    };
    this.engines = [...this.config.engines].sort(
      (a, b) => a.metadata.priority - b.metadata.priority
    );
  }

  /**
   * Run all engines for a given pipeline stage.
   * Returns the aggregated result.
   */
  async runStage(
    stage: PipelineStage,
    input: Omit<EngineInput, 'stage'>
  ): Promise<PipelineResult> {
    const startMs = Date.now();
    const stageInput: EngineInput = { ...input, stage };
    const evidence: PipelineResult['evidence'] = [];
    const violations: PipelineResult['violations'] = [];
    const metadata: Record<string, unknown> = {};
    const engineTimings: PipelineResult['timing']['engineTimings'] = [];

    let allow = true;
    let currentRequest = stageInput.request;

    // Filter engines for this stage
    const stageEngines = this.engines.filter(
      (e) => e.metadata.stages.includes(stage)
    );

    for (const engine of stageEngines) {
      const engineStart = Date.now();

      try {
        // Add timeout to engine execution
        const result = await Promise.race([
          engine.execute({
            ...stageInput,
            request: currentRequest,
          }),
          this.timeoutPromise(engine.metadata.id),
        ]);

        const durationMs = Date.now() - engineStart;
        engineTimings.push({ engine: engine.metadata.id, durationMs });

        // Process result
        if (!result.allow) {
          allow = false;
        }

        if (result.request) {
          currentRequest = result.request;
        }

        if (result.evidence) {
          evidence.push(result.evidence as Evidence);
        }

        if (result.violations) {
          for (const v of result.violations) {
            violations.push({
              engine: engine.metadata.id,
              ...v,
            });
          }
        }

        if (result.metadata) {
          Object.assign(metadata, result.metadata);
        }

        // If engine blocks and we're not continuing on failure, stop
        if (!result.allow && !this.config.continueOnFailure) {
          break;
        }
      } catch (err) {
        const durationMs = Date.now() - engineStart;
        engineTimings.push({ engine: engine.metadata.id, durationMs });

        // Fail-closed: if engine errors, block the request
        if (!this.config.continueOnFailure) {
          allow = false;
          violations.push({
            engine: engine.metadata.id,
            rule: 'engine-error',
            severity: 'critical',
            message: `Engine ${engine.metadata.id} failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
          break;
        }

        metadata[`${engine.metadata.id}_error`] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    const endMs = Date.now();

    return {
      allowed: allow,
      request: allow ? currentRequest : undefined,
      evidence,
      violations,
      timing: {
        startMs,
        endMs,
        durationMs: endMs - startMs,
        engineTimings,
      },
      metadata,
    };
  }

  /**
   * Run the full pipeline across all stages.
   */
  async run(input: Omit<EngineInput, 'stage'>): Promise<PipelineResult> {
    const startMs = Date.now();
    const allEvidence: Evidence[] = [];
    const allViolations: PipelineResult['violations'] = [];
    const allMetadata: Record<string, unknown> = {};
    const allEngineTimings: PipelineResult['timing']['engineTimings'] = [];

    let currentRequest = input.request;
    let allow = true;

    const stages: PipelineStage[] = [
      'pre-request',
      'routing',
      'request',
      'post-response',
      'evidence',
      'billing',
    ];

    for (const stage of stages) {
      const result = await this.runStage(stage, {
        ...input,
        request: currentRequest,
      });

      if (!result.allowed) {
        allow = false;
      }

      if (result.request) {
        currentRequest = result.request;
      }

      allEvidence.push(...result.evidence);
      allViolations.push(...result.violations);
      Object.assign(allMetadata, result.metadata);
      allEngineTimings.push(...result.timing.engineTimings);

      // If blocked, stop the pipeline
      if (!allow) break;
    }

    const endMs = Date.now();

    return {
      allowed: allow,
      request: allow ? currentRequest : undefined,
      evidence: allEvidence,
      violations: allViolations,
      timing: {
        startMs,
        endMs,
        durationMs: endMs - startMs,
        engineTimings: allEngineTimings,
      },
      metadata: allMetadata,
    };
  }

  private timeoutPromise(engineId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Engine ${engineId} timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  /** Get registered engines */
  getEngines(): Engine[] {
    return [...this.engines];
  }

  /** Add an engine */
  addEngine(engine: Engine): void {
    this.engines.push(engine);
    this.engines.sort((a, b) => a.metadata.priority - b.metadata.priority);
  }

  /** Remove an engine */
  removeEngine(engineId: string): void {
    this.engines = this.engines.filter((e) => e.metadata.id !== engineId);
  }
}
