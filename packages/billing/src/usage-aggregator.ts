// ============================================================
// @acg/billing — Usage Aggregator
// ============================================================
// Aggregates UsageRecord data for billing dashboards,
// invoices, and tier enforcement decisions.
// ============================================================

import type { PrismaClient } from '@acg/database';
import type { UsageSummary } from './types.js';

export class UsageAggregator {
  constructor(private prisma: PrismaClient) {}

  /** Get usage summary for an organization in a time range */
  async getSummary(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<UsageSummary> {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byModel: UsageSummary['byModel'] = {};
    const byDay: UsageSummary['byDay'] = {};
    let totalTokens = 0;
    let totalCost = 0;
    let blockedRequests = 0;
    let piiDetections = 0;
    let policyViolations = 0;

    for (const r of records) {
      const tokens = r.inputTokens + r.outputTokens;

      // By model
      if (!byModel[r.model]) {
        byModel[r.model] = { requests: 0, tokens: 0, cost: 0 };
      }
      byModel[r.model].requests += 1;
      byModel[r.model].tokens += tokens;
      byModel[r.model].cost += r.cost;

      // By day
      const day = r.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) {
        byDay[day] = { requests: 0, tokens: 0, cost: 0 };
      }
      byDay[day].requests += 1;
      byDay[day].tokens += tokens;
      byDay[day].cost += r.cost;

      totalTokens += tokens;
      totalCost += r.cost;
      if (r.blocked) blockedRequests += 1;
      if (r.piiDetected) piiDetections += 1;
      if (r.policyViolation) policyViolations += 1;
    }

    return {
      organizationId,
      period: { start, end },
      totalRequests: records.length,
      totalTokens,
      totalCost,
      byModel,
      byDay,
      blockedRequests,
      piiDetections,
      policyViolations,
    };
  }

  /** Get current billing period usage */
  async getCurrentPeriodUsage(organizationId: string): Promise<UsageSummary> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.getSummary(organizationId, periodStart, periodEnd);
  }

  /** Get usage by model for cost optimization */
  async getModelBreakdown(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ model: string; requests: number; tokens: number; cost: number; avgLatency: number }>> {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
    });

    const byModel = new Map<string, { requests: number; tokens: number; cost: number; totalLatency: number }>();

    for (const r of records) {
      const existing = byModel.get(r.model) ?? { requests: 0, tokens: 0, cost: 0, totalLatency: 0 };
      existing.requests += 1;
      existing.tokens += r.inputTokens + r.outputTokens;
      existing.cost += r.cost;
      existing.totalLatency += r.latencyMs;
      byModel.set(r.model, existing);
    }

    return Array.from(byModel.entries())
      .map(([model, data]) => ({
        model,
        requests: data.requests,
        tokens: data.tokens,
        cost: data.cost,
        avgLatency: data.requests > 0 ? Math.round(data.totalLatency / data.requests) : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  /** Get daily cost trend */
  async getDailyTrend(
    organizationId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ date: string; requests: number; cost: number; tokens: number }>> {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, { requests: number; cost: number; tokens: number }>();

    for (const r of records) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(day) ?? { requests: 0, cost: 0, tokens: 0 };
      existing.requests += 1;
      existing.cost += r.cost;
      existing.tokens += r.inputTokens + r.outputTokens;
      byDay.set(day, existing);
    }

    return Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
