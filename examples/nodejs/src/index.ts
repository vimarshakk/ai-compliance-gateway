/**
 * AI Compliance Gateway — Node.js Quickstart
 *
 * This example demonstrates:
 * 1. Chat completion with compliance checks
 * 2. Content moderation
 * 3. Health checking
 * 4. Risk assessment
 *
 * Prerequisites:
 *   - ACG Gateway running (docker compose up)
 *   - An API key (from dashboard or CLI)
 *
 * Run:
 *   npm install && npm start
 */

import { ACGClient, ACGError } from '@acg/sdk';

const client = new ACGClient({
  gatewayUrl: process.env.GATEWAY_URL ?? 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL ?? 'http://localhost:3002',
  apiKey: process.env.ACG_API_KEY ?? 'dev-key',
  organizationId: process.env.ACG_ORG_ID ?? 'my-org',
  projectId: process.env.ACG_PROJECT_ID ?? 'my-project',
});

// ─── 1. Health Check ───────────────────────────────────

async function checkHealth() {
  console.log('--- Health Check ---');
  const healthy = await client.isHealthy();
  console.log('Gateway healthy:', healthy);

  if (!healthy) {
    console.error('Gateway is not running. Start with: docker compose up');
    process.exit(1);
  }
}

// ─── 2. Chat Completion with Compliance ─────────────────

async function chatWithCompliance() {
  console.log('\n--- Chat Completion (HIPAA pack) ---');

  try {
    const response = await client.chatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful healthcare assistant.' },
        { role: 'user', content: 'What are the symptoms of diabetes?' },
      ],
      compliancePack: 'hipaa',
      firewallEnabled: true,
      piiDetectionEnabled: true,
    });

    console.log('Model:', response.model);
    console.log('Provider:', response.provider);
    console.log('Response:', response.choices[0].message.content);
    console.log('Tokens:', response.usage.totalTokens);
    console.log('Cost:', response.cost.totalCost, response.cost.currency);
    console.log('Policy decisions:', response.policyDecisions.length);
    console.log('Latency:', response.latencyMs, 'ms');
  } catch (err) {
    if (err instanceof ACGError) {
      console.error(`ACG Error [${err.statusCode}]: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ─── 3. Chat Completion (DPDP pack for Indian compliance)

async function chatWithDPDP() {
  console.log('\n--- Chat Completion (DPDP pack) ---');

  try {
    const response = await client.chatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Explain data localization requirements in India.' },
      ],
      compliancePacks: ['dpdp'],
      piiDetectionEnabled: true,
    });

    console.log('Response:', response.choices[0].message.content);
    console.log('Policy decisions:', response.policyDecisions.length);
  } catch (err) {
    if (err instanceof ACGError) {
      console.error(`ACG Error [${err.statusCode}]: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ─── 4. Content Moderation ──────────────────────────────

async function moderateContent() {
  console.log('\n--- Content Moderation ---');

  try {
    const result = await client.moderate({
      text: 'This is a sample message for content moderation testing.',
      contentTypes: ['pii', 'profanity', 'toxicity'],
    });

    console.log('Result:', result.moderationResult);
    console.log('Risk level:', result.riskLevel);
    console.log('Reasons:', result.reasons);
    console.log('Latency:', result.latencyMs, 'ms');
  } catch (err) {
    if (err instanceof ACGError) {
      console.error(`ACG Error [${err.statusCode}]: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ─── 5. Engine Status ───────────────────────────────────

async function engineStatus() {
  console.log('\n--- Engine Status ---');

  const [providers, rules, packs] = await Promise.all([
    client.routerProviders(),
    client.riskRules(),
    client.compliancePacks(),
  ]);

  console.log(`Router: ${providers.total} providers`);
  console.log(`Risk: ${rules.total} rules`);
  console.log(`Compliance: ${packs.total} packs`);
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log('AI Compliance Gateway — Node.js Example\n');

  await checkHealth();
  await chatWithCompliance();
  await chatWithDPDP();
  await moderateContent();
  await engineStatus();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
