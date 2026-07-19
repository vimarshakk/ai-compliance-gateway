import { describe, it, expect } from 'vitest';
import { PLANS, getPlan, isUnlimited, getLimitsForTier } from '../src/plans.js';
import type { SubscriptionTier } from '../src/types.js';

// ---- Plan Definitions Tests ----

describe('Plans', () => {
  const allTiers: SubscriptionTier[] = ['free', 'developer', 'startup', 'business', 'enterprise'];

  it('defines all 5 tiers', () => {
    expect(Object.keys(PLANS)).toHaveLength(5);
    for (const tier of allTiers) {
      expect(PLANS[tier]).toBeDefined();
    }
  });

  it('free tier has $0 price', () => {
    expect(PLANS.free.monthlyPrice).toBe(0);
    expect(PLANS.free.annualPrice).toBe(0);
  });

  it('enterprise tier has custom pricing', () => {
    expect(PLANS.enterprise.monthlyPrice).toBe(0); // Custom
  });

  it('pricing increases by tier', () => {
    expect(PLANS.free.monthlyPrice).toBeLessThan(PLANS.developer.monthlyPrice);
    expect(PLANS.developer.monthlyPrice).toBeLessThan(PLANS.startup.monthlyPrice);
    expect(PLANS.startup.monthlyPrice).toBeLessThan(PLANS.business.monthlyPrice);
  });

  it('limits increase by tier', () => {
    for (let i = 0; i < allTiers.length - 1; i++) {
      const current = PLANS[allTiers[i]].limits;
      const next = PLANS[allTiers[i + 1]].limits;
      // Enterprise uses -1 (unlimited), so skip that comparison
      if (next.requestsLimit !== -1) {
        expect(next.requestsLimit).toBeGreaterThanOrEqual(current.requestsLimit);
      }
      expect(next.maxTokensPerRequest).toBeGreaterThanOrEqual(current.maxTokensPerRequest);
    }
  });

  it('enterprise has unlimited requests', () => {
    expect(PLANS.enterprise.limits.requestsLimit).toBe(-1);
    expect(isUnlimited(PLANS.enterprise.limits.requestsLimit)).toBe(true);
  });

  it('free tier has limited requests', () => {
    expect(PLANS.free.limits.requestsLimit).toBe(1000);
    expect(isUnlimited(PLANS.free.limits.requestsLimit)).toBe(false);
  });

  it('getPlan returns correct plan', () => {
    expect(getPlan('free')).toBe(PLANS.free);
    expect(getPlan('enterprise')).toBe(PLANS.enterprise);
  });

  it('getLimitsForTier returns correct limits', () => {
    expect(getLimitsForTier('startup')).toBe(PLANS.startup.limits);
  });

  it('all tiers have features array', () => {
    for (const tier of allTiers) {
      expect(Array.isArray(PLANS[tier].limits.features)).toBe(true);
      expect(PLANS[tier].limits.features.length).toBeGreaterThan(0);
    }
  });

  it('all tiers have supportLevel', () => {
    for (const tier of allTiers) {
      expect(['community', 'email', 'priority', 'dedicated']).toContain(
        PLANS[tier].limits.supportLevel,
      );
    }
  });

  it('all tiers have slaUptime between 0.99 and 1', () => {
    for (const tier of allTiers) {
      expect(PLANS[tier].limits.slaUptime).toBeGreaterThanOrEqual(0.99);
      expect(PLANS[tier].limits.slaUptime).toBeLessThanOrEqual(1);
    }
  });
});

describe('isUnlimited', () => {
  it('returns true for -1', () => {
    expect(isUnlimited(-1)).toBe(true);
  });

  it('returns false for positive numbers', () => {
    expect(isUnlimited(0)).toBe(false);
    expect(isUnlimited(1000)).toBe(false);
    expect(isUnlimited(999999)).toBe(false);
  });
});
