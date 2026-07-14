// ============================================================
// @acg/billing — Billing Types
// ============================================================
// Subscription tiers, plan limits, and billing configuration.
// ============================================================

// ---- Subscription Tiers ----

export type SubscriptionTier = 'free' | 'developer' | 'startup' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

// ---- Plan Definitions ----

export interface PlanLimits {
  /** Maximum requests per billing period */
  requestsLimit: number;
  /** Maximum tokens per request */
  maxTokensPerRequest: number;
  /** Maximum cost per request (USD) */
  maxCostPerRequest: number;
  /** Maximum tokens per billing period */
  monthlyTokenLimit: number;
  /** Maximum organizations */
  maxOrganizations: number;
  /** Maximum projects per org */
  maxProjects: number;
  /** Maximum API keys */
  maxApiKeys: number;
  /** Rate limit (requests per minute) */
  rateLimitPerMinute: number;
  /** Supported models */
  allowedModels: string[];
  /** Support level */
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  /** SLA uptime guarantee */
  slaUptime: number;
  /** Features enabled */
  features: string[];
}

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  /** Monthly price in USD */
  monthlyPrice: number;
  /** Annual price in USD (0 = monthly only) */
  annualPrice: number;
  limits: PlanLimits;
}

// ---- Subscription ----

export interface Subscription {
  id: string;
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  requestsLimit: number;
  requestsUsed: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  razorpayId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Usage Aggregation ----

export interface UsageSummary {
  organizationId: string;
  period: { start: Date; end: Date };
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  /** Breakdown by model */
  byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  /** Breakdown by day */
  byDay: Record<string, { requests: number; tokens: number; cost: number }>;
  blockedRequests: number;
  piiDetections: number;
  policyViolations: number;
}

// ---- Tier Enforcement ----

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  tier: SubscriptionTier;
  /** Remaining quota in current period */
  remainingRequests: number;
  /** Percentage of quota used */
  usagePercent: number;
  /** Upgrade suggestion if blocked */
  upgradeRequired?: SubscriptionTier;
}
