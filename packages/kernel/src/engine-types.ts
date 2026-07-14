// ============================================================
// @acg/kernel — Engine Types
// ============================================================
// Defines the plugin-driven engine architecture.
// Engines are plugins that execute during the AI request pipeline.
// ============================================================

import type { Plugin, PluginMetadata, PluginContext } from './types.js';
import type { RuleEngineResult } from './rule-engine.js';
import type { Evidence } from './types.js';

// ---- Pipeline Stages ----

export type PipelineStage =
  | 'pre-request'      // Before LLM call (PII, policy, guardrails)
  | 'routing'          // Model/provider selection
  | 'request'          // LLM API call
  | 'post-response'    // After LLM call (output filter, audit)
  | 'evidence'         // Evidence collection
  | 'billing';         // Usage tracking

// ---- Engine Metadata ----

export interface EngineMetadata extends PluginMetadata {
  /** Pipeline stages this engine participates in */
  stages: PipelineStage[];
  /** Engine priority (lower = runs first) */
  priority: number;
  /** Required dependencies (other engine IDs) */
  dependencies?: string[];
}

// ---- Engine Input/Output ----

export interface EngineInput {
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Original request */
  request: {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
  /** Organization context */
  organization: {
    id: string;
    tier: string;
    compliancePacks: string[];
  };
  /** Results from previous engines */
  context: Record<string, unknown>;
}

export interface EngineOutput {
  /** Whether this engine allows the request to proceed */
  allow: boolean;
  /** Modified request (if allowed) */
  request?: EngineInput['request'];
  /** Output for the response */
  response?: {
    content?: string;
    model?: string;
    [key: string]: unknown;
  };
  /** Evidence to record */
  evidence?: Partial<Evidence>;
  /** Violations detected */
  violations?: Array<{
    rule: string;
    severity: string;
    message: string;
  }>;
  /** Metadata for downstream engines */
  metadata?: Record<string, unknown>;
  /** Error info */
  error?: {
    code: string;
    message: string;
  };
}

// ---- Engine Interface ----

export interface Engine extends Plugin {
  metadata: EngineMetadata;

  /** Execute the engine for a pipeline stage */
  execute(input: EngineInput): Promise<EngineOutput>;

  /** Optional: validate configuration */
  validateConfig?(config: Record<string, unknown>): boolean;
}

// ---- Built-in Engine Implementations ----

export interface AIRouterEngineConfig {
  /** Fallback model when primary is unavailable */
  fallbackModel?: string;
  /** Cost optimization strategy */
  costStrategy?: 'cheapest' | 'fastest' | 'balanced';
  /** Region restrictions */
  allowedRegions?: string[];
}

export interface RiskEngineConfig {
  /** Maximum risk score threshold (0-100) */
  maxRiskScore?: number;
  /** Risk categories to evaluate */
  categories?: string[];
  /** Auto-block on risk threshold exceeded */
  autoBlock?: boolean;
}

export interface GovernanceEngineConfig {
  /** Maximum tokens per request */
  maxTokens?: number;
  /** Maximum cost per request (USD) */
  maxCostPerRequest?: number;
  /** Allowed models */
  allowedModels?: string[];
  /** Blocked models */
  blockedModels?: string[];
}

export interface ComplianceEngineConfig {
  /** Active compliance packs */
  packs?: string[];
  /** Fail-closed on error */
  failClosed?: boolean;
  /** Minimum compliance score */
  minScore?: number;
}

// ---- Pipeline Runner ----

export interface PipelineConfig {
  /** Ordered list of engines to execute */
  engines: Engine[];
  /** Maximum pipeline timeout (ms) */
  timeout?: number;
  /** Whether to continue on engine failure */
  continueOnFailure?: boolean;
}

export interface PipelineResult {
  /** Final allow/deny decision */
  allowed: boolean;
  /** Modified request sent to LLM */
  request?: EngineInput['request'];
  /** LLM response (if available) */
  response?: Record<string, unknown>;
  /** All evidence collected */
  evidence: Evidence[];
  /** All violations across engines */
  violations: Array<{
    engine: string;
    rule: string;
    severity: string;
    message: string;
  }>;
  /** Pipeline timing */
  timing: {
    startMs: number;
    endMs: number;
    durationMs: number;
    engineTimings: Array<{
      engine: string;
      durationMs: number;
    }>;
  };
  /** Engine-specific metadata */
  metadata: Record<string, unknown>;
}
