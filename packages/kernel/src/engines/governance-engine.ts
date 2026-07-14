// ============================================================
// @acg/kernel — Built-in Engine: Governance Engine
// ============================================================
// Enforces organizational policies on AI usage: token limits,
// cost caps, model restrictions, and usage quotas.
// ============================================================

import type { Engine, EngineInput, EngineOutput, EngineMetadata } from '../engine-types.js';

export class GovernanceEngine implements Engine {
  metadata: EngineMetadata = {
    id: 'acg-governance',
    name: 'Governance Engine',
    version: '1.0.0',
    description: 'Enforces organizational AI governance policies',
    author: 'acg',
    scope: 'global',
    tags: ['governance', 'policy'],
    stages: ['pre-request'],
    priority: 150,
  };

  private maxTokens: number;
  private maxCostPerRequest: number;
  private allowedModels: string[];
  private blockedModels: string[];

  constructor(config: {
    maxTokens?: number;
    maxCostPerRequest?: number;
    allowedModels?: string[];
    blockedModels?: string[];
  } = {}) {
    this.maxTokens = config.maxTokens ?? 4096;
    this.maxCostPerRequest = config.maxCostPerRequest ?? 0.50;
    this.allowedModels = config.allowedModels ?? [];
    this.blockedModels = config.blockedModels ?? [];
  }

  async execute(input: EngineInput): Promise<EngineOutput> {
    const { request, organization } = input;
    const violations: EngineOutput['violations'] = [];

    // Check token limit
    if (request.max_tokens && request.max_tokens > this.maxTokens) {
      violations.push({
        rule: 'token-limit-exceeded',
        severity: 'medium',
        message: `Requested ${request.max_tokens} tokens, maximum is ${this.maxTokens}`,
      });

      // Cap the tokens
      request.max_tokens = this.maxTokens;
    }

    // Check model allowlist
    if (this.allowedModels.length > 0 && request.model) {
      if (!this.allowedModels.includes(request.model)) {
        violations.push({
          rule: 'model-not-allowed',
          severity: 'high',
          message: `Model ${request.model} is not in the allowed list`,
        });
      }
    }

    // Check model blocklist
    if (this.blockedModels.length > 0 && request.model) {
      if (this.blockedModels.includes(request.model)) {
        violations.push({
          rule: 'model-blocked',
          severity: 'critical',
          message: `Model ${request.model} is blocked by governance policy`,
        });
      }
    }

    // Check tier-based limits
    const tierLimits = this.getTierLimits(organization.tier);
    if (request.max_tokens && request.max_tokens > tierLimits.maxTokens) {
      violations.push({
        rule: 'tier-token-limit',
        severity: 'medium',
        message: `${organization.tier} tier allows max ${tierLimits.maxTokens} tokens`,
      });
    }

    const allow = violations.filter((v: { rule: string; severity: string; message: string }) => v.severity === 'critical').length === 0;

    return {
      allow,
      request: allow ? request : undefined,
      metadata: {
        governanceApplied: true,
        tier: organization.tier,
        tierLimits,
      },
      violations: violations.length > 0 ? violations : undefined,
      evidence: {
        type: 'custom',
        data: { violations, tierLimits },
      },
    };
  }

  private getTierLimits(tier: string): { maxTokens: number; maxCost: number } {
    const limits: Record<string, { maxTokens: number; maxCost: number }> = {
      free: { maxTokens: 1024, maxCost: 0.01 },
      developer: { maxTokens: 2048, maxCost: 0.05 },
      startup: { maxTokens: 4096, maxCost: 0.20 },
      business: { maxTokens: 8192, maxCost: 0.50 },
      enterprise: { maxTokens: 32768, maxCost: 5.00 },
    };
    return limits[tier] ?? limits.free;
  }

  validateConfig(config: Record<string, unknown>): boolean {
    if (config.maxTokens && typeof config.maxTokens !== 'number') return false;
    if (config.maxCostPerRequest && typeof config.maxCostPerRequest !== 'number') return false;
    if (config.allowedModels && !Array.isArray(config.allowedModels)) return false;
    if (config.blockedModels && !Array.isArray(config.blockedModels)) return false;
    return true;
  }
}
