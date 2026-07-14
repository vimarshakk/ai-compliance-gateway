import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateId(): string {
  return `cma_${crypto.randomBytes(16).toString('hex')}`;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function seed() {
  console.log('Seeding database...');

  const org = await prisma.organization.create({
    data: {
      id: generateId(),
      name: 'Acme Healthcare',
      slug: 'acme-healthcare',
      compliancePacks: ['hipaa', 'dpdp'],
      settings: { industry: 'healthcare', region: 'india' },
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  const project = await prisma.project.create({
    data: {
      id: generateId(),
      name: 'Clinical AI Assistant',
      organizationId: org.id,
      settings: { model: 'gpt-4', maxTokens: 4096 },
    },
  });
  console.log(`  Project: ${project.name} (${project.id})`);

  const policies = [
    {
      name: 'Block PHI Leakage',
      type: 'phi-blocker',
      description: 'Prevents protected health information from being sent to external LLMs',
      rules: [{ field: 'content', action: 'block', pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b', label: 'SSN' }],
      priority: 100,
    },
    {
      name: 'PII Redaction',
      type: 'pii-redactor',
      description: 'Automatically redacts personally identifiable information from prompts and responses',
      rules: [{ field: 'content', action: 'redact', patterns: ['email', 'phone', 'aadhaar'] }],
      priority: 90,
    },
    {
      name: 'Rate Limiting',
      type: 'rate-limiter',
      description: 'Limits API requests to prevent abuse',
      rules: [{ maxRequests: 1000, windowSeconds: 3600 }],
      priority: 50,
    },
    {
      name: 'Model Access Control',
      type: 'access-control',
      description: 'Restricts which models can be used by different roles',
      rules: [{ allowedModels: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'], deniedModels: ['gpt-4-turbo'] }],
      priority: 80,
    },
    {
      name: 'Cost Guardrail',
      type: 'cost-guard',
      description: 'Prevents excessive spending on LLM API calls',
      rules: [{ maxCostPerRequest: 0.5, maxCostPerDay: 100 }],
      priority: 70,
    },
    {
      name: 'Content Moderation',
      type: 'moderation',
      description: 'Blocks harmful, explicit, or inappropriate content',
      rules: [{ categories: ['hate', 'self-harm', 'sexual', 'violence'], threshold: 0.7 }],
      priority: 95,
    },
  ];

  for (const p of policies) {
    await prisma.policy.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        ...p,
        rules: p.rules as never,
      },
    });
  }
  console.log(`  Policies: ${policies.length} created`);

  const rawKey = `acg_${crypto.randomBytes(32).toString('hex')}`;
  const apiKey = await prisma.apiKey.create({
    data: {
      id: generateId(),
      organizationId: org.id,
      projectId: project.id,
      name: 'Development Key',
      keyHash: sha256(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      scopes: ['read', 'write', 'admin'],
    },
  });
  console.log(`  API Key: ${apiKey.keyPrefix}... (raw: ${rawKey})`);

  await prisma.subscription.create({
    data: {
      id: generateId(),
      organizationId: org.id,
      tier: 'startup',
      status: 'active',
      requestsLimit: 100000,
      requestsUsed: 0,
    },
  });
  console.log(`  Subscription: startup tier`);

  const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'gemini-pro'];
  const usageRecords = [];
  for (let i = 0; i < 50; i++) {
    const model = models[Math.floor(Math.random() * models.length)];
    const inputTokens = Math.floor(Math.random() * 2000) + 100;
    const outputTokens = Math.floor(Math.random() * 1000) + 50;
    const cost = (inputTokens * 0.00003) + (outputTokens * 0.00006);
    usageRecords.push({
      id: generateId(),
      organizationId: org.id,
      projectId: project.id,
      model,
      inputTokens,
      outputTokens,
      cost: parseFloat(cost.toFixed(6)),
      latencyMs: Math.floor(Math.random() * 3000) + 200,
      blocked: Math.random() < 0.1,
      piiDetected: Math.random() < 0.15,
      policyViolation: Math.random() < 0.05,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  await prisma.usageRecord.createMany({ data: usageRecords });
  console.log(`  Usage Records: ${usageRecords.length} created`);

  const auditEntries = [
    { action: 'policy.create', resource: 'policies', details: { name: 'Block PHI Leakage' } },
    { action: 'api_key.create', resource: 'api-keys', details: { name: 'Development Key' } },
    { action: 'project.create', resource: 'projects', details: { name: 'Clinical AI Assistant' } },
    { action: 'prompt.complete', resource: 'chat/completions', details: { model: 'gpt-4', tokens: 1500 } },
    { action: 'prompt.blocked', resource: 'chat/completions', details: { reason: 'PII detected', riskScore: 85 } },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        projectId: project.id,
        action: entry.action,
        resource: entry.resource,
        details: entry.details as never,
        riskScore: entry.action.includes('blocked') ? 85 : 10,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`  Audit Logs: ${auditEntries.length} created`);

  console.log('\nSeed complete!');
  console.log(`\nUse these to test:`);
  console.log(`  Organization ID: ${org.id}`);
  console.log(`  Project ID: ${project.id}`);
  console.log(`  API Key: ${rawKey}`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
