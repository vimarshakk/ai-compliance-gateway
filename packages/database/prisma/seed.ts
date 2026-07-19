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
  console.log(`  API Key prefix: ${apiKey.keyPrefix}... (key saved in DB as hash)`);

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

  const aiProviders = [
    { slug: 'openai', name: 'OpenAI', company: 'OpenAI, Inc.', baseUrl: 'https://api.openai.com/v1', apiStyle: 'openai', complianceFeatures: { gdpr: true, soc2: true, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['us', 'eu'], maxTokens: 128000, models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o3'], certified: true },
    { slug: 'anthropic', name: 'Claude', company: 'Anthropic, PBC', baseUrl: 'https://api.anthropic.com/v1', apiStyle: 'anthropic', complianceFeatures: { gdpr: true, soc2: true, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['us', 'eu'], maxTokens: 200000, models: ['claude-opus-4', 'claude-sonnet-4', 'claude-3-haiku'], certified: true },
    { slug: 'google', name: 'Gemini', company: 'Google LLC', baseUrl: 'https://generativelanguage.googleapis.com/v1', apiStyle: 'google', complianceFeatures: { gdpr: true, soc2: true, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['us', 'eu', 'global'], maxTokens: 1000000, models: ['gemini-2.5-pro', 'gemini-2.5-flash'], certified: true },
    { slug: 'azure-openai', name: 'Azure OpenAI', company: 'Microsoft Corporation', baseUrl: 'https://your-resource.openai.azure.com', apiStyle: 'openai', complianceFeatures: { gdpr: true, soc2: true, hipaa: true, pci: true, dpdp: true, abdm: false }, supportedRegions: ['us', 'eu', 'india', 'gov'], maxTokens: 128000, models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'], certified: true },
    { slug: 'vertex-ai', name: 'Vertex AI', company: 'Google LLC', baseUrl: 'https://us-central1-aiplatform.googleapis.com', apiStyle: 'google', complianceFeatures: { gdpr: true, soc2: true, hipaa: true, pci: false, dpdp: true, abdm: false }, supportedRegions: ['us', 'eu', 'india'], maxTokens: 1000000, models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'chirp'], certified: true },
    { slug: 'bedrock', name: 'Amazon Bedrock', company: 'AWS', baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com', apiStyle: 'custom', complianceFeatures: { gdpr: true, soc2: true, hipaa: true, pci: true, dpdp: true, abdm: false }, supportedRegions: ['us', 'eu', 'india', 'gov'], maxTokens: 200000, models: ['anthropic.claude-opus-4', 'anthropic.claude-sonnet-4', 'amazon.titan-text'], certified: true },
    { slug: 'groq', name: 'Groq', company: 'Groq, Inc.', baseUrl: 'https://api.groq.com/openai/v1', apiStyle: 'openai', complianceFeatures: { gdpr: false, soc2: false, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['us'], maxTokens: 32000, models: ['llama-3.3-70b', 'mixtral-8x7b', 'gemma2-9b'], certified: false },
    { slug: 'together', name: 'Together AI', company: 'Together AI, Inc.', baseUrl: 'https://api.together.xyz/v1', apiStyle: 'openai', complianceFeatures: { gdpr: false, soc2: false, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['us'], maxTokens: 32000, models: ['meta-llama/Llama-3.3-70B', 'mistralai/Mixtral-8x22B'], certified: false },
    { slug: 'openrouter', name: 'OpenRouter', company: 'OpenRouter, Inc.', baseUrl: 'https://openrouter.ai/api/v1', apiStyle: 'openai', complianceFeatures: { gdpr: false, soc2: false, hipaa: false, pci: false, dpdp: false, abdm: false }, supportedRegions: ['global'], maxTokens: 200000, models: ['openai/gpt-4o', 'anthropic/claude-opus-4', 'meta-llama/llama-3.3-70b'], certified: false },
    { slug: 'ollama', name: 'Ollama', company: 'Ollama (Local)', baseUrl: 'http://localhost:11434', apiStyle: 'custom', complianceFeatures: { gdpr: true, soc2: true, hipaa: true, pci: true, dpdp: true, abdm: true }, supportedRegions: ['local'], maxTokens: 32000, models: ['llama3.3', 'mistral', 'codellama', 'phi3'], certified: true },
  ];

  for (const p of aiProviders) {
    await prisma.aiProvider.create({
      data: {
        ...p,
        complianceFeatures: p.complianceFeatures as never,
      },
    });
  }
  console.log(`  AI Providers: ${aiProviders.length} created`);

  console.log('\nSeed complete!');
  console.log(`\nUse these to test:`);
  console.log(`  Organization ID: ${org.id}`);
  console.log(`  Project ID: ${project.id}`);
  console.log(`  API Key prefix: ${apiKey.keyPrefix}...`);
  console.log(`  (To create a new key, use POST /v1/api-keys)`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
