// ============================================================
// @acg/billing — Subscription Manager
// ============================================================
// CRUD operations for subscriptions, tier changes, and
// period management. Uses Prisma for persistence.
// ============================================================

import type { PrismaClient } from '@acg/database';
import type { Subscription, SubscriptionTier, SubscriptionStatus } from './types.js';
import { PLANS, getPlan, isUnlimited } from './plans.js';

export class SubscriptionManager {
  constructor(private prisma: PrismaClient) {}

  /** Get subscription for an organization */
  async get(organizationId: string): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!row) return null;
    return this.toSubscription(row);
  }

  /** Get or create a free subscription */
  async getOrCreate(organizationId: string): Promise<Subscription> {
    const existing = await this.get(organizationId);
    if (existing) return existing;

    const plan = PLANS.free;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const row = await this.prisma.subscription.create({
      data: {
        organizationId,
        tier: 'free',
        status: 'active',
        requestsLimit: plan.limits.requestsLimit,
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return this.toSubscription(row);
  }

  /** Upgrade or downgrade a subscription */
  async changeTier(
    organizationId: string,
    newTier: SubscriptionTier,
  ): Promise<Subscription> {
    const plan = getPlan(newTier);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const row = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        tier: newTier,
        status: 'active',
        requestsLimit: plan.limits.requestsLimit,
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier: newTier,
        requestsLimit: plan.limits.requestsLimit,
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: 'active',
      },
    });

    return this.toSubscription(row);
  }

  /** Update subscription status (e.g., past_due, canceled) */
  async updateStatus(
    organizationId: string,
    status: SubscriptionStatus,
  ): Promise<Subscription> {
    const row = await this.prisma.subscription.update({
      where: { organizationId },
      data: { status },
    });
    return this.toSubscription(row);
  }

  /** Increment usage counter (returns updated subscription) */
  async recordUsage(organizationId: string, tokens: number): Promise<Subscription> {
    const sub = await this.getOrCreate(organizationId);

    // Check if we need to roll over to a new period
    if (sub.currentPeriodEnd && new Date() > sub.currentPeriodEnd) {
      return this.rolloverPeriod(organizationId, sub);
    }

    const row = await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        requestsUsed: { increment: 1 },
      },
    });

    return this.toSubscription(row);
  }

  /** Roll over to a new billing period */
  private async rolloverPeriod(
    organizationId: string,
    current: Subscription,
  ): Promise<Subscription> {
    const plan = getPlan(current.tier);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const row = await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return this.toSubscription(row);
  }

  /** Check if organization has remaining quota */
  async hasQuota(organizationId: string): Promise<boolean> {
    const sub = await this.getOrCreate(organizationId);
    if (isUnlimited(sub.requestsLimit)) return true;
    return sub.requestsUsed < sub.requestsLimit;
  }

  /** Get remaining requests in current period */
  async getRemainingRequests(organizationId: string): Promise<number> {
    const sub = await this.getOrCreate(organizationId);
    if (isUnlimited(sub.requestsLimit)) return -1;
    return Math.max(0, sub.requestsLimit - sub.requestsUsed);
  }

  /** List all subscriptions (admin) */
  async list(options: { limit?: number; offset?: number } = {}): Promise<Subscription[]> {
    const { limit = 50, offset = 0 } = options;
    const rows = await this.prisma.subscription.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toSubscription(r));
  }

  /** Cancel subscription (downgrades to free at period end) */
  async cancel(organizationId: string): Promise<Subscription> {
    return this.updateStatus(organizationId, 'canceled');
  }

  /** Reactivate a canceled subscription */
  async reactivate(organizationId: string): Promise<Subscription> {
    return this.updateStatus(organizationId, 'active');
  }

  private toSubscription(row: any): Subscription {
    return {
      id: row.id,
      organizationId: row.organizationId,
      tier: row.tier as SubscriptionTier,
      status: row.status as SubscriptionStatus,
      requestsLimit: row.requestsLimit,
      requestsUsed: row.requestsUsed,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      stripeCustomerId: row.stripeCustomerId,
      razorpayId: row.razorpayId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
