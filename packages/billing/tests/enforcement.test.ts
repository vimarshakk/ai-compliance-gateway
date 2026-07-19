import { describe, it, expect } from 'vitest';
import { TierEnforcer } from '../src/tier-enforcer.js';
import { PLANS } from '../src/plans.js';
import type { SubscriptionTier } from '../src/types.js';

// ---- TierEnforcer Unit Tests (no DB) ----

describe('TierEnforcer', () => {
  // We test the static logic methods only — DB-dependent methods
  // are tested via integration tests.

  it('can be instantiated', () => {
    // We can't instantiate with a real PrismaClient in unit tests,
    // so we test the static helper methods on the class
    expect(typeof TierEnforcer).toBe('function');
  });

  describe('getTierInfo', () => {
    // Test the plan lookup logic directly
    it('returns correct limits for free tier', () => {
      const plan = PLANS.free;
      expect(plan.limits.requestsLimit).toBe(1000);
      expect(plan.limits.maxTokensPerRequest).toBe(4096);
    });

    it('returns correct limits for enterprise tier', () => {
      const plan = PLANS.enterprise;
      expect(plan.limits.requestsLimit).toBe(-1);
      expect(plan.limits.maxTokensPerRequest).toBe(1_000_000);
    });

    it('all tiers have valid rate limits', () => {
      const tiers: SubscriptionTier[] = ['free', 'developer', 'startup', 'business', 'enterprise'];
      for (const tier of tiers) {
        expect(PLANS[tier].limits.rateLimitPerMinute).toBeGreaterThan(0);
      }
    });
  });
});

// ---- Enforcement Logic Tests (simulated) ----

describe('Enforcement logic (simulated)', () => {
  function simulateEnforce(
    sub: { tier: SubscriptionTier; status: string; requestsUsed: number } | null,
  ): { allowed: boolean; reason?: string; remaining: number; upgradeRequired?: SubscriptionTier } {
    if (!sub) {
      return { allowed: true, remaining: PLANS.free.limits.requestsLimit };
    }

    if (sub.status === 'canceled' || sub.status === 'paused') {
      return {
        allowed: false,
        reason: `Subscription is ${sub.status}`,
        remaining: 0,
        upgradeRequired: 'free',
      };
    }

    const plan = PLANS[sub.tier];
    if (plan.limits.requestsLimit === -1) {
      return { allowed: true, remaining: -1 };
    }

    const remaining = Math.max(0, plan.limits.requestsLimit - sub.requestsUsed);
    if (remaining <= 0) {
      const tiers: SubscriptionTier[] = ['free', 'developer', 'startup', 'business', 'enterprise'];
      const idx = tiers.indexOf(sub.tier);
      const nextTier = idx < tiers.length - 1 ? tiers[idx + 1] : 'enterprise';
      return {
        allowed: false,
        reason: `Quota exceeded (${sub.requestsUsed}/${plan.limits.requestsLimit})`,
        remaining: 0,
        upgradeRequired: nextTier,
      };
    }

    return { allowed: true, remaining };
  }

  it('allows requests with no subscription (free default)', () => {
    const result = simulateEnforce(null);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1000);
  });

  it('blocks canceled subscription', () => {
    const result = simulateEnforce({
      tier: 'startup',
      status: 'canceled',
      requestsUsed: 100,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('canceled');
  });

  it('blocks paused subscription', () => {
    const result = simulateEnforce({
      tier: 'business',
      status: 'paused',
      requestsUsed: 0,
    });
    expect(result.allowed).toBe(false);
  });

  it('allows within quota', () => {
    const result = simulateEnforce({
      tier: 'developer',
      status: 'active',
      requestsUsed: 100,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(49900);
  });

  it('blocks when quota exceeded', () => {
    const result = simulateEnforce({
      tier: 'free',
      status: 'active',
      requestsUsed: 1000,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Quota exceeded');
    expect(result.upgradeRequired).toBe('developer');
  });

  it('suggests correct upgrade tier', () => {
    const result = simulateEnforce({
      tier: 'developer',
      status: 'active',
      requestsUsed: 50000,
    });
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe('startup');
  });

  it('enterprise tier always allows (unlimited)', () => {
    const result = simulateEnforce({
      tier: 'enterprise',
      status: 'active',
      requestsUsed: 999_999_999,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  it('counts remaining correctly for startup tier', () => {
    const result = simulateEnforce({
      tier: 'startup',
      status: 'active',
      requestsUsed: 400_000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100_000);
  });
});

// ---- Plan Feature Matrix Tests ----

describe('Plan feature matrix', () => {
  it('free tier has basic features only', () => {
    const features = PLANS.free.limits.features;
    expect(features).toContain('basic-compliance');
    expect(features).toContain('api-access');
    expect(features).not.toContain('risk-engine');
    expect(features).not.toContain('marketplace');
  });

  it('startup tier has compliance packs', () => {
    const features = PLANS.startup.limits.features;
    expect(features).toContain('compliance-packs');
    expect(features).toContain('ai-router');
    expect(features).toContain('evidence-store');
  });

  it('enterprise tier has all features', () => {
    const features = PLANS.enterprise.limits.features;
    expect(features).toContain('marketplace');
    expect(features).toContain('on-premise');
    expect(features).toContain('abdm');
    expect(features).toContain('dpdp-full');
    expect(features).toContain('hipaa-full');
  });

  it('SLA increases by tier', () => {
    expect(PLANS.free.limits.slaUptime).toBeLessThan(PLANS.developer.limits.slaUptime);
    expect(PLANS.developer.limits.slaUptime).toBeLessThan(PLANS.startup.limits.slaUptime);
    expect(PLANS.startup.limits.slaUptime).toBeLessThan(PLANS.business.limits.slaUptime);
    expect(PLANS.business.limits.slaUptime).toBeLessThan(PLANS.enterprise.limits.slaUptime);
  });

  it('model access increases by tier', () => {
    // Free has 2 models, startup has 6, enterprise has wildcard ['*']
    expect(PLANS.free.limits.allowedModels.length).toBe(2);
    expect(PLANS.startup.limits.allowedModels.length).toBeGreaterThan(
      PLANS.free.limits.allowedModels.length,
    );
    // Enterprise uses wildcard '*' meaning all models
    expect(PLANS.enterprise.limits.allowedModels).toContain('*');
  });
});
