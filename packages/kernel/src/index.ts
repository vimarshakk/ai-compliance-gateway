// ============================================================
// @acg/kernel — Platform Kernel
// ============================================================
// The core execution kernel for the AI Trust Platform.
// Every product surface (CLI, Cloud, VS Code, GitHub Action,
// MCP, Marketplace) consumes this kernel.
// ============================================================

// Types
export type {
  // Plugin System
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginScope,
  PluginLifecycleHook,

  // Rule Engine
  Rule,
  RuleMetadata,
  RuleInput,
  RuleResult,
  RuleSeverity,
  RuleCategory,
  RuleStatus,
  RuleFix,
  RuleContext,

  // Policy Engine
  Policy,
  PolicyRule,
  PolicyCondition,
  PolicyEffect,
  PolicyTarget,
  PolicyDecision,

  // Evidence Engine
  Evidence,
  EvidenceType,
  EvidenceChain,
  EvidenceGenerator,

  // Risk Engine
  RiskAssessment,
  RiskLevel,
  RiskCategory,
  RiskCalculator,

  // AI Request/Response
  AIRequest,
  AIResponse,
  AIMessage,
  AIMessageRole,

  // Asset Graph
  Asset,
  AssetType,
  AssetEdge,
  AssetRelation,
  AssetGraph,
  AssetStats,

  // Registry
  RegistryType,
  RegistryEntry,
  RegistryQuery,

  // Kernel Events
  KernelEvent,
  KernelEventType,
  KernelEventHandler,
} from './types.js';

// Runtime
export { PluginRuntime } from './plugin-runtime.js';
export type { PluginRuntimeOptions } from './plugin-runtime.js';

// Rule Engine
export { RuleEngine, createRule, pass, fail, skip, error } from './rule-engine.js';
export type { RuleEngineOptions, RuleEngineResult } from './rule-engine.js';

// Registry
export { Registry } from './registry.js';

// Asset Graph
export { AssetGraphEngine } from './asset-graph.js';

// Evidence Engine
export { EvidenceEngine } from './evidence-engine.js';

// BOM Adapter
export { bomToGraph } from './bom-adapter.js';
export type { BomEntry, BomResult } from './bom-adapter.js';

// Compliance Score Engine
export { ComplianceScoreEngine } from './compliance-score.js';
export type { ComplianceScoreResult, ScoreBreakdown, ScanSummary, ScanFinding } from './compliance-score.js';

// Engine Types & Pipeline
export type {
  Engine,
  EngineMetadata,
  EngineInput,
  EngineOutput,
  PipelineStage,
  PipelineConfig,
  PipelineResult,
  AIRouterEngineConfig,
  RiskEngineConfig,
  GovernanceEngineConfig,
  ComplianceEngineConfig,
} from './engine-types.js';

export { PipelineRunner } from './pipeline-runner.js';

// Built-in Engines
export { AIRouterEngine, RiskEngine, GovernanceEngine, ComplianceEngine } from './engines/index.js';
