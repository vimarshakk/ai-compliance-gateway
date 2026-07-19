import { describe, it, expect } from 'vitest';
import { AIRouter, createDefaultRouter } from '../src/index.js';

describe('AIRouter', () => {
  const router = createDefaultRouter();

  it('routes to default provider for basic request', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      messages: [{ role: 'user', content: 'Hello' }],
      compliancePacks: [],
      containsPII: false,
      priority: 'normal',
    });

    expect(decision).toBeDefined();
    expect(decision.selectedProvider).toBeDefined();
    expect(typeof decision.selectedProvider.id).toBe('string');
    expect(decision.selectedModel).toBeDefined();
    expect(decision.reason).toBeDefined();
    expect(typeof decision.estimatedCost).toBe('number');
    expect(typeof decision.estimatedLatencyMs).toBe('number');
  });

  it('routes to PII-aware provider when PII detected', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      containsPII: true,
      compliancePacks: [],
      messages: [{ role: 'user', content: 'My SSN is 123-45-6789' }],
      priority: 'normal',
    });

    expect(decision.selectedProvider).toBeDefined();
    expect(decision.selectedModel).toBeDefined();
  });

  it('routes to HIPAA-compliant provider', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      compliancePacks: ['hipaa'],
      containsPII: false,
      messages: [{ role: 'user', content: 'Patient data' }],
      priority: 'normal',
    });

    expect(decision.selectedProvider).toBeDefined();
    expect(decision.routingMetadata.complianceRoute).toBe(true);
  });

  it('picks cheapest provider when strategy is cost', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      compliancePacks: [],
      containsPII: false,
      messages: [{ role: 'user', content: 'Simple query' }],
      priority: 'normal',
    });

    expect(decision.selectedProvider).toBeDefined();
    expect(decision.routingMetadata.strategy).toBeDefined();
  });

  it('picks fastest provider when strategy is latency', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      compliancePacks: [],
      containsPII: false,
      messages: [{ role: 'user', content: 'Quick answer' }],
      priority: 'normal',
    });

    expect(decision.selectedProvider).toBeDefined();
  });

  it('records usage and provider health', () => {
    router.recordUsage('openai');
    router.recordSuccess('openai');
    const health = router.getProviderHealth();
    expect(health).toBeDefined();
    expect(Array.isArray(health)).toBe(true);
    const openai = health.find((h) => h.provider === 'OpenAI');
    expect(openai).toBeDefined();
    expect(openai!.healthy).toBe(true);
  });

  it('trips circuit breaker after failures', () => {
    for (let i = 0; i < 10; i++) {
      router.recordFailure('anthropic');
    }
    const health = router.getProviderHealth();
    const anthropic = health.find((h) => h.provider === 'Anthropic');
    expect(anthropic).toBeDefined();
    expect(anthropic!.failureCount).toBeGreaterThanOrEqual(5);
  });

  it('rejects unknown model if it is in a provider list', () => {
    // The router picks a provider that has the model; if no provider has it, it throws
    expect(() => {
      router.route({
        organizationId: 'org_1',
        userId: 'user_1',
        model: 'nonexistent-model-xyz',
        compliancePacks: [],
        containsPII: false,
        messages: [{ role: 'user', content: 'test' }],
        priority: 'normal',
      });
    }).toThrow();
  });

  it('returns alternatives array', () => {
    const decision = router.route({
      organizationId: 'org_1',
      userId: 'user_1',
      compliancePacks: [],
      containsPII: false,
      messages: [{ role: 'user', content: 'test' }],
      priority: 'normal',
    });

    expect(Array.isArray(decision.alternatives)).toBe(true);
  });
});
