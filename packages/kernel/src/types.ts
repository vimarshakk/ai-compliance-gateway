// ============================================================
// @acg/kernel — Platform Kernel Types
// ============================================================
// The core type system for the AI Trust Platform kernel.
// Every component (Plugin Runtime, Rule Engine, Registry,
// Asset Graph, Evidence Engine) operates on these types.
// ============================================================

// ---- Plugin System ----

export type PluginScope = 'global' | 'organization' | 'project';

export type PluginLifecycleHook =
  | 'onLoad'
  | 'onActivate'
  | 'onDeactivate'
  | 'onUnload'
  | 'onRequest'
  | 'onResponse'
  | 'onViolation'
  | 'onEvidence';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  scope: PluginScope;
  tags: string[];
  dependencies?: string[];
  minKernelVersion?: string;
}

export interface PluginContext {
  pluginId: string;
  organizationId?: string;
  projectId?: string;
  requestId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface Plugin {
  metadata: PluginMetadata;
  activate?(ctx: PluginContext): Promise<void> | void;
  deactivate?(ctx: PluginContext): Promise<void> | void;
  onLoad?(ctx: PluginContext): Promise<void> | void;
  onUnload?(ctx: PluginContext): Promise<void> | void;
  rules?: Rule[];
  policies?: Policy[];
  evidenceGenerators?: EvidenceGenerator[];
  riskCalculators?: RiskCalculator[];
}

// ---- Rule Engine ----

export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleCategory = 'compliance' | 'security' | 'governance' | 'cost' | 'quality' | 'privacy' | 'custom';
export type RuleStatus = 'pass' | 'fail' | 'skip' | 'error';

export interface RuleMetadata {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  category: RuleCategory;
  version: string;
  pluginId: string;
  tags: string[];
  documentationUrl?: string;
  fixable: boolean;
}

export interface RuleInput {
  request?: AIRequest;
  response?: AIResponse;
  asset?: Asset;
  context: RuleContext;
}

export interface RuleContext {
  organizationId?: string;
  projectId?: string;
  requestId?: string;
  pluginId: string;
  timestamp: number;
  config: Record<string, unknown>;
}

export interface RuleResult {
  ruleId: string;
  status: RuleStatus;
  message: string;
  evidence?: Evidence;
  risk?: RiskAssessment;
  fix?: RuleFix;
  details?: Record<string, unknown>;
}

export interface RuleFix {
  description: string;
  autoFixable: boolean;
  fixer?: (input: RuleInput) => Promise<AIRequest | AIResponse>;
}

export interface Rule {
  metadata: RuleMetadata;
  evaluate(input: RuleInput): Promise<RuleResult>;
}

// ---- Policy Engine ----

export type PolicyEffect = 'allow' | 'deny' | 'warn' | 'transform';
export type PolicyTarget = 'request' | 'response' | 'asset' | 'model' | 'user';

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface PolicyRule {
  conditions: PolicyCondition[];
  conditionLogic: 'all' | 'any';
  effect: PolicyEffect;
  message?: string;
  transform?: (data: unknown) => unknown;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  pluginId: string;
  target: PolicyTarget;
  enabled: boolean;
  priority: number;
  rules: PolicyRule[];
}

export interface PolicyDecision {
  policyId: string;
  effect: PolicyEffect;
  matchedRules: number;
  message?: string;
  transformedData?: unknown;
}

// ---- Evidence Engine ----

export type EvidenceType = 'request' | 'response' | 'compliance' | 'audit' | 'security' | 'cost' | 'custom';

export interface Evidence {
  id: string;
  type: EvidenceType;
  timestamp: number;
  requestId?: string;
  organizationId?: string;
  projectId?: string;
  pluginId: string;
  ruleId?: string;
  data: Record<string, unknown>;
  hash: string;
  previousHash?: string;
  chainValid: boolean;
}

export interface EvidenceGenerator {
  pluginId: string;
  evidenceType: EvidenceType;
  generate(input: RuleInput, result: RuleResult): Promise<Evidence>;
}

export interface EvidenceChain {
  entries: Evidence[];
  valid: boolean;
  brokenAt?: number;
}

// ---- Risk Engine ----

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskCategory = 'data-leak' | 'policy-violation' | 'cost-overrun' | 'compliance-gap' | 'security-threat' | 'quality-degradation' | 'supply-chain' | 'custom';

export interface RiskAssessment {
  id: string;
  level: RiskLevel;
  category: RiskCategory;
  score: number; // 0-100
  description: string;
  evidence: string[];
  recommendations: string[];
  autoRemediable: boolean;
  timestamp: number;
}

export interface RiskCalculator {
  pluginId: string;
  calculate(results: RuleResult[], context: RuleContext): Promise<RiskAssessment>;
}

// ---- AI Request/Response ----

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  name?: string;
  functionCall?: { name: string; arguments: string };
}

export interface AIRequest {
  id: string;
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  plugins?: string[];
  organizationId?: string;
  projectId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  id: string;
  requestId: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

// ---- Asset Graph ----

export type AssetType = 'model' | 'provider' | 'prompt' | 'agent' | 'tool' | 'mcp-server' | 'vector-store' | 'embedding' | 'dataset' | 'policy' | 'connector' | 'secret' | 'custom';

export type AssetRelation = 'uses' | 'depends-on' | 'calls' | 'trained-on' | 'accesses' | 'configured-by' | 'enforces' | 'custom';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  organizationId?: string;
  projectId?: string;
  metadata: Record<string, unknown>;
  discoveredAt: number;
  updatedAt: number;
  source: string;
}

export interface AssetEdge {
  source: string;
  target: string;
  relation: AssetRelation;
  metadata?: Record<string, unknown>;
}

export interface AssetGraph {
  assets: Asset[];
  edges: AssetEdge[];
  stats: AssetStats;
}

export interface AssetStats {
  totalAssets: number;
  byType: Record<AssetType, number>;
  totalEdges: number;
  byRelation: Record<AssetRelation, number>;
  lastScan: number;
}

// ---- Registry ----

export type RegistryType = 'model' | 'provider' | 'plugin' | 'rule' | 'policy' | 'connector' | 'pack' | 'custom';

export interface RegistryEntry {
  id: string;
  type: RegistryType;
  name: string;
  version: string;
  metadata: Record<string, unknown>;
  registeredAt: number;
  updatedAt: number;
  status: 'active' | 'deprecated' | 'disabled';
}

export interface RegistryQuery {
  type?: RegistryType;
  name?: string;
  status?: 'active' | 'deprecated' | 'disabled';
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ---- Kernel Events ----

export type KernelEventType =
  | 'plugin.loaded'
  | 'plugin.activated'
  | 'plugin.deactivated'
  | 'plugin.unloaded'
  | 'rule.evaluated'
  | 'policy.evaluated'
  | 'evidence.created'
  | 'risk.assessed'
  | 'asset.discovered'
  | 'asset.updated'
  | 'registry.registered'
  | 'registry.updated'
  | 'request.received'
  | 'response.received'
  | 'violation.detected';

export interface KernelEvent {
  type: KernelEventType;
  timestamp: number;
  source: string;
  data: Record<string, unknown>;
}

export type KernelEventHandler = (event: KernelEvent) => Promise<void> | void;
