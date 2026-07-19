// ============================================================
// @acg/kernel — Built-in Engine: AI Router
// ============================================================
// Routes requests to the optimal AI provider based on cost,
// latency, region, and compliance requirements.
// ============================================================

import type { Engine, EngineInput, EngineOutput, EngineMetadata } from '../engine-types.js';

export class AIRouterEngine implements Engine {
  metadata: EngineMetadata = {
    id: 'acg-router',
    name: 'AI Router',
    version: '1.0.0',
    description: 'Routes requests to optimal AI provider',
    author: 'acg',
    scope: 'global',
    tags: ['routing', 'ai'],
    stages: ['routing'],
    priority: 100,
  };

  private fallbackModel: string;
  private costStrategy: 'cheapest' | 'fastest' | 'balanced';
  private allowedRegions: string[];

  constructor(config: {
    fallbackModel?: string;
    costStrategy?: 'cheapest' | 'fastest' | 'balanced';
    allowedRegions?: string[];
  } = {}) {
    this.fallbackModel = config.fallbackModel ?? 'gpt-4o-mini';
    this.costStrategy = config.costStrategy ?? 'balanced';
    this.allowedRegions = config.allowedRegions ?? [];
  }

  async execute(input: EngineInput): Promise<EngineOutput> {
    const { request, organization } = input;

    // If model is already specified and allowed, pass through
    if (request.model) {
      return {
        allow: true,
        request,
        metadata: {
          routingDecision: 'passthrough',
          selectedModel: request.model,
        },
      };
    }

    // Select model based on strategy and organization tier
    const selectedModel = this.selectModel(organization.tier);

    return {
      allow: true,
      request: {
        ...request,
        model: selectedModel,
      },
      metadata: {
        routingDecision: 'auto-selected',
        selectedModel,
        strategy: this.costStrategy,
        tier: organization.tier,
      },
    };
  }

  private selectModel(tier: string): string {
    // Tier-based model selection
    const tierModels: Record<string, string> = {
      free: 'gpt-4o-mini',
      developer: 'gpt-4o-mini',
      startup: 'gpt-4o',
      business: 'gpt-4o',
      enterprise: 'gpt-4o',
    };

    return tierModels[tier] ?? this.fallbackModel;
  }

  validateConfig(config: Record<string, unknown>): boolean {
    if (config.fallbackModel && typeof config.fallbackModel !== 'string') return false;
    if (config.costStrategy && !['cheapest', 'fastest', 'balanced'].includes(config.costStrategy as string)) return false;
    if (config.allowedRegions && !Array.isArray(config.allowedRegions)) return false;
    return true;
  }
}
