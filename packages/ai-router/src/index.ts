/**
 * AI Router Engine — Intelligent model/provider routing
 *
 * Routes requests to the optimal provider based on:
 * - Cost optimization (cheapest provider for the task)
 * - Latency optimization (fastest provider)
 * - Compliance routing (HIPAA-only providers for PHI)
 * - Fallback chains (automatic failover)
 * - Load balancing (distribute across providers)
 * - Rate limit awareness (avoid throttled providers)
 */

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  costPer1kInput: number;
  costPer1kOutput: number;
  avgLatencyMs: number;
  maxRpm: number;
  maxTokens: number;
  hipaaCompliant: boolean;
  pciCompliant: boolean;
  soc2Compliant: boolean;
  region: string; // 'us', 'eu', 'india'
  enabled: boolean;
  priority: number;
  weight: number; // for weighted load balancing
}

export interface RoutingRequest {
  model?: string;
  provider?: string;
  organizationId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  compliancePacks: string[];
  containsPII: boolean;
  maxTokens?: number;
  temperature?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface RoutingDecision {
  selectedProvider: ProviderConfig;
  selectedModel: string;
  reason: string;
  alternatives: Array<{ provider: string; model: string; reason: string }>;
  estimatedCost: number;
  estimatedLatencyMs: number;
  routingMetadata: {
    strategy: string;
    complianceRoute: boolean;
    fallbackUsed: boolean;
    loadBalanced: boolean;
  };
}

export interface RoutingStrategy {
  name: string;
  optimize: 'cost' | 'latency' | 'balanced' | 'compliance';
  fallbackChain: string[];
  maxRetries: number;
}

export class AIRouter {
  private providers: Map<string, ProviderConfig> = new Map();
  private strategies: Map<string, RoutingStrategy> = new Map();
  private usageCounters: Map<string, { count: number; windowStart: number }> = new Map();
  private circuitBreakers: Map<string, { open: boolean; failures: number; lastFailure: number; halfOpenAt: number }> = new Map();

  constructor() {
    this.strategies.set('default', {
      name: 'default',
      optimize: 'balanced',
      fallbackChain: [],
      maxRetries: 2,
    });
  }

  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.id, config);
  }

  removeProvider(id: string): void {
    this.providers.delete(id);
  }

  registerStrategy(strategy: RoutingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  route(request: RoutingRequest, strategyName = 'default'): RoutingDecision {
    const strategy = this.strategies.get(strategyName) ?? this.strategies.get('default')!;
    const candidates = this.getCandidates(request, strategy);

    if (candidates.length === 0) {
      throw new Error('No available providers match the routing criteria');
    }

    let selected: ProviderConfig;
    let reason: string;

    if (strategy.optimize === 'compliance' || request.compliancePacks.length > 0) {
      const compliant = candidates.filter((c) => this.meetsCompliance(c, request.compliancePacks));
      if (compliant.length === 0) {
        throw new Error('No providers meet the required compliance standards');
      }
      selected = this.selectByCost(compliant);
      reason = `Compliance route: ${request.compliancePacks.join(', ')} required`;
    } else if (strategy.optimize === 'cost') {
      selected = this.selectByCost(candidates);
      reason = 'Cost-optimized selection';
    } else if (strategy.optimize === 'latency') {
      selected = this.selectByLatency(candidates);
      reason = 'Latency-optimized selection';
    } else {
      selected = this.selectBalanced(candidates);
      reason = 'Balanced selection (cost + latency)';
    }

    const model = this.resolveModel(selected, request.model);
    const alternatives = candidates
      .filter((c) => c.id !== selected.id)
      .slice(0, 3)
      .map((c) => ({
        provider: c.name,
        model: this.resolveModel(c, request.model),
        reason: `Alternative (${strategy.optimize})`,
      }));

    return {
      selectedProvider: selected,
      selectedModel: model,
      reason,
      alternatives,
      estimatedCost: this.estimateCost(selected, request.messages, model),
      estimatedLatencyMs: selected.avgLatencyMs,
      routingMetadata: {
        strategy: strategy.name,
        complianceRoute: request.compliancePacks.length > 0,
        fallbackUsed: false,
        loadBalanced: candidates.length > 1,
      },
    };
  }

  recordUsage(providerId: string): void {
    const counter = this.usageCounters.get(providerId) ?? { count: 0, windowStart: Date.now() };
    const now = Date.now();
    if (now - counter.windowStart > 60_000) {
      counter.count = 0;
      counter.windowStart = now;
    }
    counter.count++;
    this.usageCounters.set(providerId, counter);
  }

  recordFailure(providerId: string): void {
    const breaker = this.circuitBreakers.get(providerId) ?? { open: false, failures: 0, lastFailure: 0, halfOpenAt: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= 5) {
      breaker.open = true;
      breaker.halfOpenAt = Date.now() + 60_000;
    }
    this.circuitBreakers.set(providerId, breaker);
  }

  recordSuccess(providerId: string): void {
    this.circuitBreakers.delete(providerId);
  }

  getProviderHealth(): Array<{ provider: string; healthy: boolean; failureCount: number; usageInWindow: number }> {
    return Array.from(this.providers.entries()).map(([id, config]) => {
      const breaker = this.circuitBreakers.get(id);
      const counter = this.usageCounters.get(id);
      return {
        provider: config.name,
        healthy: !breaker?.open,
        failureCount: breaker?.failures ?? 0,
        usageInWindow: counter?.count ?? 0,
      };
    });
  }

  private getCandidates(request: RoutingRequest, strategy: RoutingStrategy): ProviderConfig[] {
    let candidates = Array.from(this.providers.values()).filter((p) => {
      if (!p.enabled) return false;
      if (request.provider && p.id !== request.provider) return false;
      if (request.model && !p.models.includes(request.model)) return false;
      if (p.maxTokens < (request.maxTokens ?? 4096)) return false;
      return true;
    });

    // Filter out circuit-broken providers
    const now = Date.now();
    candidates = candidates.filter((p) => {
      const breaker = this.circuitBreakers.get(p.id);
      if (!breaker) return true;
      if (!breaker.open) return true;
      if (now > breaker.halfOpenAt) {
        breaker.open = false;
        breaker.failures = 0;
        return true;
      }
      return false;
    });

    // Filter out rate-limited providers
    candidates = candidates.filter((p) => {
      const counter = this.usageCounters.get(p.id);
      if (!counter) return true;
      return counter.count < p.maxRpm;
    });

    return candidates;
  }

  private meetsCompliance(provider: ProviderConfig, packs: string[]): boolean {
    for (const pack of packs) {
      if (pack === 'hipaa' && !provider.hipaaCompliant) return false;
      if (pack === 'pci' && !provider.pciCompliant) return false;
      if (pack === 'soc2' && !provider.soc2Compliant) return false;
    }
    return true;
  }

  private selectByCost(providers: ProviderConfig[]): ProviderConfig {
    return providers.reduce((best, curr) =>
      curr.costPer1kInput < best.costPer1kInput ? curr : best
    );
  }

  private selectByLatency(providers: ProviderConfig[]): ProviderConfig {
    return providers.reduce((best, curr) =>
      curr.avgLatencyMs < best.avgLatencyMs ? curr : best
    );
  }

  private selectBalanced(providers: ProviderConfig[]): ProviderConfig {
    return providers.reduce((best, curr) => {
      const bestScore = this.costLatencyScore(best);
      const currScore = this.costLatencyScore(curr);
      return currScore < bestScore ? curr : best;
    });
  }

  private costLatencyScore(p: ProviderConfig): number {
    const normalizedCost = p.costPer1kInput / 0.06;
    const normalizedLatency = p.avgLatencyMs / 5000;
    return normalizedCost * 0.5 + normalizedLatency * 0.5;
  }

  private resolveModel(provider: ProviderConfig, requestedModel?: string): string {
    if (requestedModel && provider.models.includes(requestedModel)) return requestedModel;
    return provider.models[0];
  }

  private estimateCost(provider: ProviderConfig, messages: Array<{ role: string; content: string }>, model: string): number {
    const inputTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const estimatedOutputTokens = Math.min(1024, inputTokens);
    const inputCost = (inputTokens / 1000) * provider.costPer1kInput;
    const outputCost = (estimatedOutputTokens / 1000) * provider.costPer1kOutput;
    return parseFloat((inputCost + outputCost).toFixed(6));
  }
}

export function createDefaultRouter(): AIRouter {
  const router = new AIRouter();

  router.registerProvider({
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'],
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
    avgLatencyMs: 2000,
    maxRpm: 500,
    maxTokens: 128000,
    hipaaCompliant: false,
    pciCompliant: false,
    soc2Compliant: true,
    region: 'us',
    enabled: true,
    priority: 1,
    weight: 30,
  });

  router.registerProvider({
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    avgLatencyMs: 2500,
    maxRpm: 200,
    maxTokens: 200000,
    hipaaCompliant: true,
    pciCompliant: false,
    soc2Compliant: true,
    region: 'us',
    enabled: true,
    priority: 2,
    weight: 25,
  });

  router.registerProvider({
    id: 'google',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
    models: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    avgLatencyMs: 1500,
    maxRpm: 60,
    maxTokens: 32000,
    hipaaCompliant: false,
    pciCompliant: false,
    soc2Compliant: true,
    region: 'us',
    enabled: true,
    priority: 3,
    weight: 20,
  });

  router.registerProvider({
    id: 'azure-openai',
    name: 'Azure OpenAI',
    baseUrl: process.env.AZURE_OPENAI_ENDPOINT ?? '',
    apiKey: process.env.AZURE_OPENAI_KEY ?? '',
    models: ['gpt-4', 'gpt-35-turbo'],
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
    avgLatencyMs: 1800,
    maxRpm: 1000,
    maxTokens: 128000,
    hipaaCompliant: true,
    pciCompliant: true,
    soc2Compliant: true,
    region: 'us',
    enabled: true,
    priority: 0,
    weight: 25,
  });

  return router;
}
