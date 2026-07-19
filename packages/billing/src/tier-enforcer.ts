// ============================================================
// @acg/billing — Tier Enforcer
// ============================================================
// Gateway middleware that checks subscription limits before
// allowing AI requests. Fail-closed: blocks if subscription
// check fails.
// ============================================================

import type { PrismaClient } from '@acg/database';
import type { SubscriptionTier, EnforcementResult } from './types.js';
import { getPlan, isUnlimited } from './plans.js';

export class TierEnforcer {
  constructor(private prisma: PrismaClient) {}

  /** Check if an organization can make a request */
  async enforce(organizationId: string): Promise<EnforcementResult> {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    // No subscription = free tier (fail-open for new orgs)
    if (!sub) {
      const plan = getPlan('free');
      return {
        allowed: true,
        tier: 'free',
        remainingRequests: plan.limits.requestsLimit,
        usagePercent: 0,
      };
    }

    const tier = sub.tier as SubscriptionTier;
    const plan = getPlan(tier);

    // Check subscription status
    if (sub.status === 'canceled' || sub.status === 'paused') {
      return {
        allowed: false,
        reason: `Subscription is ${sub.status}`,
        tier,
        remainingRequests: 0,
        usagePercent: 100,
        upgradeRequired: 'free',
      };
    }

    // Check request quota
    if (!isUnlimited(plan.limits.requestsLimit)) {
      const remaining = Math.max(0, plan.limits.requestsLimit - sub.requestsUsed);
      const usagePercent = Math.round((sub.requestsUsed / plan.limits.requestsLimit) * 100);

      if (remaining <= 0) {
        return {
          allowed: false,
          reason: `Request quota exceeded (${sub.requestsUsed}/${plan.limits.requestsLimit})`,
          tier,
          remainingRequests: 0,
          usagePercent: 100,
          upgradeRequired: this.suggestUpgrade(tier),
        };
      }

      // Warn at 80% usage
      if (usagePercent >= 80) {
        return {
          allowed: true,
          reason: `Usage at ${usagePercent}% — approaching limit`,
          tier,
          remainingRequests: remaining,
          usagePercent,
        };
      }

      return {
        allowed: true,
        tier,
        remainingRequests: remaining,
        usagePercent,
      };
    }

    // Unlimited tier
    return {
      allowed: true,
      tier,
      remainingRequests: -1,
      usagePercent: 0,
    };
  }

  /** Get enforcement info for a specific tier */
  getTierInfo(tier: SubscriptionTier): {
    limits: ReturnType<typeof getPlan>['limits'];
    isUnlimited: boolean;
  } {
    const plan = getPlan(tier);
    return {
      limits: plan.limits,
      isUnlimited: isUnlimited(plan.limits.requestsLimit),
    };
  }

  /** Suggest the next tier up */
  private suggestUpgrade(current: SubscriptionTier): SubscriptionTier {
    const tiers: SubscriptionTier[] = ['free', 'developer', 'startup', 'business', 'enterprise'];
    const idx = tiers.indexOf(current);
    return idx < tiers.length - 1 ? tiers[idx + 1] : 'enterprise';
  }
}
