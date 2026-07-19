// ============================================================
// @acg/kernel — Rule Engine
// ============================================================
// ESLint-style rule evaluation: Rule → Evaluate → Evidence →
// Fix → Risk → Recommendation
// ============================================================

import type {
  Rule,
  RuleInput,
  RuleResult,
  RuleSeverity,
  RuleCategory,
  RuleMetadata,
  RuleStatus,
  PluginContext,
  Evidence,
  RiskAssessment,
  RuleFix,
} from './types.js';
import { randomUUID } from 'node:crypto';

// ---- Built-in Rule Helpers ----

export function createRule(meta: Omit<RuleMetadata, 'id'>, evaluate: Rule['evaluate']): Rule {
  return {
    metadata: { ...meta, id: randomUUID() },
    evaluate,
  };
}

export function pass(ruleId: string, message: string, details?: Record<string, unknown>): RuleResult {
  return { ruleId, status: 'pass', message, details };
}

export function fail(ruleId: string, message: string, options?: {
  evidence?: Evidence;
  risk?: RiskAssessment;
  fix?: RuleFix;
  details?: Record<string, unknown>;
}): RuleResult {
  return { ruleId, status: 'fail', message, ...options };
}

export function skip(ruleId: string, message: string): RuleResult {
  return { ruleId, status: 'skip', message };
}

export function error(ruleId: string, message: string, details?: Record<string, unknown>): RuleResult {
  return { ruleId, status: 'error', message, details };
}

// ---- Rule Engine ----

export interface RuleEngineOptions {
  failOnError?: boolean;
  maxConcurrent?: number;
}

export interface RuleEngineResult {
  results: RuleResult[];
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  violations: RuleResult[];
  overallStatus: RuleStatus;
  durationMs: number;
}

export class RuleEngine {
  private rules = new Map<string, Rule>();
  private options: Required<RuleEngineOptions>;

  constructor(options: RuleEngineOptions = {}) {
    this.options = {
      failOnError: options.failOnError ?? false,
      maxConcurrent: options.maxConcurrent ?? 10,
    };
  }

  // ---- Rule Registration ----

  register(rule: Rule): void {
    this.rules.set(rule.metadata.id, rule);
  }

  unregister(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  get(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  list(): RuleMetadata[] {
    return Array.from(this.rules.values()).map((r) => r.metadata);
  }

  listByCategory(category: RuleCategory): RuleMetadata[] {
    return this.list().filter((r) => r.category === category);
  }

  listBySeverity(severity: RuleSeverity): RuleMetadata[] {
    return this.list().filter((r) => r.severity === severity);
  }

  count(): number {
    return this.rules.size;
  }

  // ---- Rule Evaluation ----

  async evaluate(input: RuleInput, ruleIds?: string[]): Promise<RuleEngineResult> {
    const start = Date.now();
    const rulesToEvaluate = ruleIds
      ? ruleIds.map((id) => this.rules.get(id)).filter((r): r is Rule => r !== undefined)
      : Array.from(this.rules.values());

    const results: RuleResult[] = [];

    // Evaluate in batches for concurrency control
    for (let i = 0; i < rulesToEvaluate.length; i += this.options.maxConcurrent) {
      const batch = rulesToEvaluate.slice(i, i + this.options.maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(async (rule) => {
          try {
            return await rule.evaluate(input);
          } catch (err) {
            return error(
              rule.metadata.id,
              `Rule evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
              { error: String(err) }
            );
          }
        })
      );
      results.push(...batchResults);

      // If failOnError and we got an error, stop
      if (this.options.failOnError && batchResults.some((r) => r.status === 'error')) {
        break;
      }
    }

    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const skipped = results.filter((r) => r.status === 'skip').length;
    const errors = results.filter((r) => r.status === 'error').length;
    const violations = results.filter((r) => r.status === 'fail');

    return {
      results,
      passed,
      failed,
      skipped,
      errors,
      violations,
      overallStatus: errors > 0 ? 'error' : failed > 0 ? 'fail' : 'pass',
      durationMs: Date.now() - start,
    };
  }

  // ---- Bulk Registration ----

  registerMany(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  unregisterMany(ruleIds: string[]): void {
    for (const id of ruleIds) {
      this.unregister(id);
    }
  }

  // ---- Stats ----

  stats() {
    const rules = Array.from(this.rules.values());
    return {
      total: rules.length,
      byCategory: rules.reduce(
        (acc, r) => {
          acc[r.metadata.category] = (acc[r.metadata.category] ?? 0) + 1;
          return acc;
        },
        {} as Record<RuleCategory, number>
      ),
      bySeverity: rules.reduce(
        (acc, r) => {
          acc[r.metadata.severity] = (acc[r.metadata.severity] ?? 0) + 1;
          return acc;
        },
        {} as Record<RuleSeverity, number>
      ),
      fixable: rules.filter((r) => r.metadata.fixable).length,
    };
  }
}
