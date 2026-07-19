import { describe, it, expect, beforeAll } from 'vitest';

const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3002';

let adminUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${ADMIN_URL}/health`, { signal: AbortSignal.timeout(3000) });
    adminUp = res.ok;
  } catch {
    adminUp = false;
  }
  if (!adminUp) console.log('Skipping Admin API tests: service not reachable at', ADMIN_URL);
});

// ============================================
// Compliance Scores API
// ============================================
describe('Compliance Scores API', () => {
  it('returns empty list when no scores exist', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/compliance/scores`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('scores');
    expect(data).toHaveProperty('total');
  });

  it('returns 404 for nonexistent score', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/compliance/scores/nonexistent-id`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('returns score history with default params', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/compliance/scores/history`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('history');
    expect(data).toHaveProperty('days');
    expect(data.days).toBe(30);
  });

  it('returns score history with custom days param', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/compliance/scores/history?days=7`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.days).toBe(7);
  });
});

// ============================================
// AI Providers API
// ============================================
describe('AI Providers API', () => {
  it('lists all providers', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/providers`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('providers');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.providers)).toBe(true);
  });

  it('returns 404 for nonexistent provider', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/providers/nonexistent-id`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});

// ============================================
// Compliance Tools API
// ============================================
describe('Compliance Tools API', () => {
  it('returns compliance packs list', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/tools/packs`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('packs');
    expect(data).toHaveProperty('total');
    expect(data.total).toBeGreaterThan(0);
  });
});

// ============================================
// Subscriptions & Billing API
// ============================================
describe('Subscriptions API', () => {
  const testOrgId = 'test-sub-org-1';

  it('returns empty list when no subscriptions exist', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('subscriptions');
    expect(data).toHaveProperty('total');
  });

  it('creates a new subscription', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: testOrgId, tier: 'startup' }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.organizationId).toBe(testOrgId);
    expect(data.tier).toBe('startup');
  });

  it('returns the created subscription', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions/${testOrgId}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.tier).toBe('startup');
  });

  it('returns 404 for nonexistent subscription', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('updates subscription tier', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions/${testOrgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'enterprise' }),
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.tier).toBe('enterprise');
  });

  it('returns usage summary for subscription', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions/${testOrgId}/usage`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('plan');
  });

  it('validates tier on create', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: 'bad-tier', tier: 'mega-premium' }),
    });
    expect(res.status).toBe(400);
  });

  it('cleans up test subscription', async () => {
    if (!adminUp) return;
    const res = await fetch(`${ADMIN_URL}/v1/subscriptions/${testOrgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'canceled' }),
    });
    expect(res.ok).toBe(true);
  });
});
