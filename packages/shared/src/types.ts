export type LLMProvider =
  | 'openai' | 'anthropic' | 'gemini' | 'azure-openai' | 'aws-bedrock'
  | 'ollama' | 'vllm' | 'nvidia-dynamo' | 'nvidia-nim' | 'groq'
  | 'together-ai' | 'openrouter' | 'sarvam-ai' | 'krutrim';

export type CompliancePack = 'dpdp' | 'hipaa' | 'gdpr' | 'soc2' | 'iso27001' | 'rbi' | 'irdai' | 'sebi' | 'pci_dss' | 'nist_ai_rmf';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'api-consumer';

export type PIIDetectionType =
  | 'aadhaar' | 'pan' | 'passport' | 'abha_id' | 'upi_id'
  | 'driving_license' | 'medical_record_number' | 'insurance_id'
  | 'gstin' | 'ifsc' | 'bank_account' | 'credit_card'
  | 'mobile_number' | 'email' | 'name' | 'date_of_birth'
  | 'address' | 'ip_address';

export type FirewallCheckType =
  | 'prompt_injection' | 'jailbreak' | 'toxicity' | 'hallucination'
  | 'data_leakage' | 'sensitive_information' | 'topic_violation'
  | 'content_policy' | 'regex_filter' | 'custom_rule';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface PolicyDecision {
  policyId: string;
  policyName: string;
  action: { type: string; [key: string]: unknown };
  matched: boolean;
  evaluationMs: number;
}

export interface PIIDetectionResult {
  containsPII: boolean;
  entities: PIIEntity[];
  riskScore: number;
  processingMs: number;
}

export interface PIIEntity {
  type: PIIDetectionType;
  value: string;
  start: number;
  end: number;
  confidence: number;
  action: 'allow' | 'mask' | 'redact' | 'encrypt' | 'block';
}

export interface FirewallResult {
  passed: boolean;
  checks: FirewallCheck[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  blockedReason: string | null;
  processingMs: number;
}

export interface FirewallCheck {
  type: FirewallCheckType;
  passed: boolean;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
}

export interface ComplianceEvaluation {
  pack: CompliancePack;
  passed: boolean;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  pack: CompliancePack;
  requirement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  remediation: string;
}

export interface AIRequest {
  id: string;
  organizationId: string;
  projectId: string;
  userId: string;
  apiKeyId: string;
  model?: string;
  provider?: LLMProvider;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  maxTokens?: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface AIResponse {
  id: string;
  requestId: string;
  model: string;
  provider: LLMProvider;
  choices: Array<{ index: number; message: ChatMessage; finishReason: string | null }>;
  usage: TokenUsage;
  cost: CostBreakdown;
  policyDecisions: PolicyDecision[];
  piiResult: PIIDetectionResult | null;
  firewallResult: FirewallResult | null;
  complianceEvals: ComplianceEvaluation[];
  latencyMs: number;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  projectId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  immutableHash: string;
  timestamp: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  environment: 'development' | 'staging' | 'production';
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: 'active' | 'revoked';
  createdAt: Date;
}

export interface Policy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  priority: number;
  regoPolicy: string;
  compliancePack: CompliancePack | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
  requestId: string;
}

export interface ModerationRequest {
  id: string;
  organizationId: string;
  userId: string;
  text: string;
  messages?: Array<{ role: ChatMessage['role']; content: string }>;
  contentTypes?: string[];
  timestamp: Date;
}

export interface ModerationResponse {
  id: string;
  moderationResult: 'approved' | 'rejected' | 'flagged';
  reasons: string[];
  piiResult: PIIDetectionResult | null;
  complianceEvals: ComplianceEvaluation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  latencyMs: number;
  timestamp: Date;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
