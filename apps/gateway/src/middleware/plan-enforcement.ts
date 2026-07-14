import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@acg/database';
import { getPlan, isUnlimited } from '@acg/billing';

/**
 * Plan Enforcement Middleware
 *
 * Checks the organization's subscription before allowing
 * AI requests through the gateway. Fail-closed: blocks
 * if subscription check fails.
 *
 * Must run after apiKeyAuth (needs request.apiKeyRecord).
 */
export async function planEnforcement(app: FastifyInstance, prisma: PrismaClient) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only enforce on LLM API endpoints
    const path = request.url;
    if (!path.startsWith('/chat/completions') && !path.startsWith('/moderations')) return;

    // Skip if no API key record (health checks, etc.)
    const apiKeyRecord = (request as any).apiKeyRecord;
    if (!apiKeyRecord?.organizationId) return;

    const organizationId = apiKeyRecord.organizationId;

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
      });

      // No subscription = free tier (allow with free limits)
      if (!subscription) {
        const plan = getPlan('free');
        (request as any).subscriptionTier = 'free';
        (request as any).subscriptionLimits = plan.limits;
        return;
      }

      // Check subscription status
      if (subscription.status === 'canceled' || subscription.status === 'paused') {
        return reply.status(403).send({
          error: 'Subscription inactive',
          message: `Your subscription is ${subscription.status}. Please reactivate to continue.`,
          tier: subscription.tier,
        });
      }

      const tier = subscription.tier as 'free' | 'developer' | 'startup' | 'business' | 'enterprise';
      const plan = getPlan(tier);

      // Check request quota
      if (!isUnlimited(plan.limits.requestsLimit)) {
        const remaining = plan.limits.requestsLimit - subscription.requestsUsed;
        if (remaining <= 0) {
          return reply.status(429).send({
            error: 'Quota exceeded',
            message: `You have used ${subscription.requestsUsed}/${plan.limits.requestsLimit} requests this period.`,
            tier,
            upgradeRequired: suggestUpgrade(tier),
          });
        }

        // Add usage headers
        reply.header('X-Quota-Limit', plan.limits.requestsLimit);
        reply.header('X-Quota-Remaining', remaining);
        reply.header('X-Quota-Used', subscription.requestsUsed);
      }

      // Attach subscription info for downstream use
      (request as any).subscriptionTier = tier;
      (request as any).subscriptionLimits = plan.limits;

      // Add tier header
      reply.header('X-Tier', tier);
    } catch (err) {
      // Fail-closed: block on error
      request.log.error(err, 'Plan enforcement check failed');
      return reply.status(503).send({
        error: 'Service temporarily unavailable',
        message: 'Unable to verify subscription. Please try again.',
      });
    }
  });
}

function suggestUpgrade(current: string): string {
  const tiers = ['free', 'developer', 'startup', 'business', 'enterprise'];
  const idx = tiers.indexOf(current);
  return idx < tiers.length - 1 ? tiers[idx + 1] : 'enterprise';
}
