import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SubscriptionTier } from '@acg/billing';

interface CreateSubscriptionBody {
  organizationId: string;
  tier: SubscriptionTier;
}

interface UpdateSubscriptionParams {
  id: string;
}

interface UpdateSubscriptionBody {
  tier?: SubscriptionTier;
  status?: string;
}

// ---- Handlers ----

export async function createSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as CreateSubscriptionBody;
  const { organizationId, tier } = body;

  if (!organizationId || !tier) {
    return reply.status(400).send({ error: 'organizationId and tier are required' });
  }

  const validTiers = ['free', 'developer', 'startup', 'business', 'enterprise'];
  if (!validTiers.includes(tier)) {
    return reply.status(400).send({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
  }

  const prisma = (request.server as any).prisma;

  try {
    // Check if subscription already exists
    const existing = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Subscription already exists for this organization',
        subscriptionId: existing.id,
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const limits = getLimitsForTier(tier);

    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        tier,
        status: 'active',
        requestsLimit: limits.requestsLimit,
        requestsUsed: 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return reply.status(201).send({
      id: subscription.id,
      organizationId: subscription.organizationId,
      tier: subscription.tier,
      status: subscription.status,
      requestsLimit: subscription.requestsLimit,
      requestsUsed: subscription.requestsUsed,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      createdAt: subscription.createdAt,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({ error: 'Failed to create subscription' });
  }
}

export async function getSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId } = request.params as { organizationId: string };

  const prisma = (request.server as any).prisma;

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription) {
    return reply.status(404).send({ error: 'Subscription not found' });
  }

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    tier: subscription.tier,
    status: subscription.status,
    requestsLimit: subscription.requestsLimit,
    requestsUsed: subscription.requestsUsed,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    stripeCustomerId: subscription.stripeCustomerId,
    razorpayId: subscription.razorpayId,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

export async function updateSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId } = request.params as { organizationId: string };
  const body = request.body as UpdateSubscriptionBody;

  const prisma = (request.server as any).prisma;

  const existing = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!existing) {
    return reply.status(404).send({ error: 'Subscription not found' });
  }

  const updateData: Record<string, unknown> = {};

  if (body.tier) {
    const validTiers = ['free', 'developer', 'startup', 'business', 'enterprise'];
    if (!validTiers.includes(body.tier)) {
      return reply.status(400).send({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
    }

    const limits = getLimitsForTier(body.tier);
    updateData.tier = body.tier;
    updateData.requestsLimit = limits.requestsLimit;
    updateData.requestsUsed = 0; // Reset on tier change

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    updateData.currentPeriodStart = now;
    updateData.currentPeriodEnd = periodEnd;
  }

  if (body.status) {
    const validStatuses = ['active', 'past_due', 'canceled', 'trialing', 'paused'];
    if (!validStatuses.includes(body.status)) {
      return reply.status(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    updateData.status = body.status;
  }

  const subscription = await prisma.subscription.update({
    where: { organizationId },
    data: updateData,
  });

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    tier: subscription.tier,
    status: subscription.status,
    requestsLimit: subscription.requestsLimit,
    requestsUsed: subscription.requestsUsed,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    updatedAt: subscription.updatedAt,
  };
}

export async function listSubscriptionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

  const prisma = (request.server as any).prisma;

  const subscriptions = await prisma.subscription.findMany({
    take: Math.min(limit, 100),
    skip: offset,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      organizationId: true,
      tier: true,
      status: true,
      requestsLimit: true,
      requestsUsed: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
    },
  });

  const total = await prisma.subscription.count();

  return {
    subscriptions,
    total,
    limit,
    offset,
  };
}

export async function usageSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId } = request.params as { organizationId: string };

  const prisma = (request.server as any).prisma;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const records = await prisma.usageRecord.findMany({
    where: {
      organizationId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
  });

  let totalTokens = 0;
  let totalCost = 0;
  const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};

  for (const r of records) {
    const tokens = r.inputTokens + r.outputTokens;
    totalTokens += tokens;
    totalCost += r.cost;

    if (!byModel[r.model]) {
      byModel[r.model] = { requests: 0, tokens: 0, cost: 0 };
    }
    byModel[r.model].requests += 1;
    byModel[r.model].tokens += tokens;
    byModel[r.model].cost += r.cost;
  }

  return {
    organizationId,
    period: { start: periodStart, end: periodEnd },
    totalRequests: records.length,
    totalTokens,
    totalCost,
    byModel,
  };
}

// ---- Helper ----

function getLimitsForTier(tier: SubscriptionTier) {
  const limits: Record<SubscriptionTier, { requestsLimit: number }> = {
    free: { requestsLimit: 1000 },
    developer: { requestsLimit: 50000 },
    startup: { requestsLimit: 500000 },
    business: { requestsLimit: 5000000 },
    enterprise: { requestsLimit: -1 },
  };
  return limits[tier];
}
