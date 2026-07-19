// ============================================================
// @acg/billing — Plan Definitions
// ============================================================
// All subscription tiers with limits, pricing, and features.
// ============================================================

import type { Plan, PlanLimits, SubscriptionTier } from './types.js';

export const PLANS: Record<SubscriptionTier, Plan> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'For individual developers and experiments',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      requestsLimit: 1_000,
      maxTokensPerRequest: 4_096,
      maxCostPerRequest: 0.01,
      monthlyTokenLimit: 500_000,
      maxOrganizations: 1,
      maxProjects: 2,
      maxApiKeys: 3,
      rateLimitPerMinute: 10,
      allowedModels: ['gpt-4o-mini', 'claude-3-haiku'],
      supportLevel: 'community',
      slaUptime: 0.99,
      features: ['basic-compliance', 'api-access', 'dashboard'],
    },
  },
  developer: {
    tier: 'developer',
    name: 'Developer',
    description: 'For developers building AI applications',
    monthlyPrice: 29,
    annualPrice: 290,
    limits: {
      requestsLimit: 50_000,
      maxTokensPerRequest: 8_192,
      maxCostPerRequest: 0.05,
      monthlyTokenLimit: 10_000_000,
      maxOrganizations: 2,
      maxProjects: 10,
      maxApiKeys: 10,
      rateLimitPerMinute: 60,
      allowedModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku', 'claude-3-sonnet'],
      supportLevel: 'email',
      slaUptime: 0.995,
      features: ['basic-compliance', 'api-access', 'dashboard', 'risk-engine', 'governance-engine', 'compliance-packs'],
    },
  },
  startup: {
    tier: 'startup',
    name: 'Startup',
    description: 'For growing teams and production workloads',
    monthlyPrice: 199,
    annualPrice: 1_990,
    limits: {
      requestsLimit: 500_000,
      maxTokensPerRequest: 32_768,
      maxCostPerRequest: 0.50,
      monthlyTokenLimit: 100_000_000,
      maxOrganizations: 5,
      maxProjects: 50,
      maxApiKeys: 25,
      rateLimitPerMinute: 300,
      allowedModels: [
        'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo',
        'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus',
      ],
      supportLevel: 'priority',
      slaUptime: 0.999,
      features: [
        'basic-compliance', 'api-access', 'dashboard', 'risk-engine',
        'governance-engine', 'compliance-packs', 'ai-router', 'evidence-store',
        'audit-logs', 'sso',
      ],
    },
  },
  business: {
    tier: 'business',
    name: 'Business',
    description: 'For enterprises with high-volume AI usage',
    monthlyPrice: 999,
    annualPrice: 9_990,
    limits: {
      requestsLimit: 5_000_000,
      maxTokensPerRequest: 128_000,
      maxCostPerRequest: 5.00,
      monthlyTokenLimit: 1_000_000_000,
      maxOrganizations: 20,
      maxProjects: 200,
      maxApiKeys: 100,
      rateLimitPerMinute: 1_000,
      allowedModels: [
        'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'o1-preview',
        'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus',
        'gemini-pro', 'llama-3.1-405b',
      ],
      supportLevel: 'priority',
      slaUptime: 0.9999,
      features: [
        'basic-compliance', 'api-access', 'dashboard', 'risk-engine',
        'governance-engine', 'compliance-packs', 'ai-router', 'evidence-store',
        'audit-logs', 'sso', 'custom-policies', 'multi-region', 'analytics',
      ],
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For regulated industries with strict compliance requirements',
    monthlyPrice: 0, // Custom pricing
    annualPrice: 0,
    limits: {
      requestsLimit: -1, // Unlimited
      maxTokensPerRequest: 1_000_000,
      maxCostPerRequest: 50.00,
      monthlyTokenLimit: -1, // Unlimited
      maxOrganizations: -1, // Unlimited
      maxProjects: -1, // Unlimited
      maxApiKeys: -1, // Unlimited
      rateLimitPerMinute: 10_000,
      allowedModels: ['*'], // All models
      supportLevel: 'dedicated',
      slaUptime: 0.99999,
      features: [
        'basic-compliance', 'api-access', 'dashboard', 'risk-engine',
        'governance-engine', 'compliance-packs', 'ai-router', 'evidence-store',
        'audit-logs', 'sso', 'custom-policies', 'multi-region', 'analytics',
        'marketplace', 'on-premise', 'dedicated-support', 'custom-integrations',
        'abdm', 'dpdp-full', 'hipaa-full',
      ],
    },
  },
};

// ---- Helpers ----

export function getPlan(tier: SubscriptionTier): Plan {
  return PLANS[tier];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function getLimitsForTier(tier: SubscriptionTier): PlanLimits {
  return PLANS[tier].limits;
}
