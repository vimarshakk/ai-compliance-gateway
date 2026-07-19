import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@acg/database';

export async function usageTracking(app: FastifyInstance, prisma: PrismaClient) {
  // Track usage for every completed request
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only track for LLM API endpoints
    const path = request.url;
    if (!path.startsWith('/chat/completions') && !path.startsWith('/moderations')) return;

    const apiKeyRecord = (request as any).apiKeyRecord;
    const requestId = request.headers['x-request-id'] as string;
    const latencyMs = reply.elapsedTime;

    // Extract usage from response (will be populated by workflow)
    const responseUsage = (request as any).responseUsage ?? {};
    const responseModel = (request as any).responseModel ?? 'unknown';
    const wasBlocked = reply.statusCode === 403 || reply.statusCode === 429;
    const piiDetected = (request as any).piiDetected ?? false;
    const policyViolation = (request as any).policyViolation ?? false;

    try {
      await prisma.usageRecord.create({
        data: {
          organizationId: apiKeyRecord?.organizationId ?? 'anonymous',
          projectId: apiKeyRecord?.projectId,
          model: responseModel,
          inputTokens: responseUsage.prompt_tokens ?? 0,
          outputTokens: responseUsage.completion_tokens ?? 0,
          cost: responseUsage.total_cost ?? 0,
          latencyMs,
          blocked: wasBlocked,
          piiDetected,
          policyViolation,
        },
      });
    } catch {
      // Usage tracking failure should not affect the response
    }

    // Publish usage event for real-time metering
    try {
      const nats = (app as any).connectors?.nats;
      if (nats) {
        await nats.publish('usage.recorded', {
          organizationId: apiKeyRecord?.organizationId ?? 'anonymous',
          projectId: apiKeyRecord?.projectId,
          model: responseModel,
          inputTokens: responseUsage.prompt_tokens ?? 0,
          outputTokens: responseUsage.completion_tokens ?? 0,
          cost: responseUsage.total_cost ?? 0,
          latencyMs,
          requestId,
        });
      }
    } catch {
      // Fire-and-forget
    }
  });
}

// Calculate cost based on model pricing (per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gemini-pro': { input: 1.25, output: 5.0 },
  'gemini-flash': { input: 0.075, output: 0.3 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4o'];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export async function getUsageSummary(prisma: PrismaClient, organizationId: string, periodStart: Date, periodEnd: Date) {
  const records = await prisma.usageRecord.findMany({
    where: {
      organizationId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
  const totalRequests = records.length;
  const blockedRequests = records.filter(r => r.blocked).length;
  const avgLatencyMs = records.length > 0 ? records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length : 0;

  // Per-model breakdown
  const byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number; cost: number }> = {};
  for (const r of records) {
    if (!byModel[r.model]) byModel[r.model] = { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    byModel[r.model].requests++;
    byModel[r.model].inputTokens += r.inputTokens;
    byModel[r.model].outputTokens += r.outputTokens;
    byModel[r.model].cost += r.cost;
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost,
    totalRequests,
    blockedRequests,
    avgLatencyMs: Math.round(avgLatencyMs),
    byModel,
  };
}
