import { ACGClient } from '@acg/sdk';

const client = new ACGClient({
  gatewayUrl: process.env.GATEWAY_URL ?? 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL ?? 'http://localhost:3002',
  apiKey: process.env.ACG_API_KEY ?? 'dev-key',
  organizationId: 'my-org',
  projectId: 'my-project',
});

async function main() {
  // Chat completion with compliance checks
  const response = await client.chatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is AI compliance?' },
    ],
    compliancePack: 'hipaa',
    firewallEnabled: true,
    piiDetectionEnabled: true,
  });

  console.log('Response:', response.choices[0].message.content);
  console.log('Cost:', response.cost);
  console.log('Policy decisions:', response.policyDecisions);

  // Content moderation
  const moderation = await client.moderate({
    text: 'This is a test message for moderation.',
    contentTypes: ['pii', 'profanity', 'toxicity'],
  });

  console.log('Moderation result:', moderation.moderationResult);
  console.log('Risk level:', moderation.riskLevel);
}

main().catch(console.error);
