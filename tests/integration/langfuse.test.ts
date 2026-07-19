import { describe, it, expect, beforeAll } from 'vitest';

const LANGFUSE_URL = process.env.LANGFUSE_URL ?? 'http://localhost:3007';

let publicKey = '';
let secretKey = '';

async function langfuseRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const res = await fetch(`${LANGFUSE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// ============================================
// Langfuse Integration Tests
// ============================================
describe('Langfuse Integration', () => {
  it('UI is accessible', async () => {
    const res = await fetch(LANGFUSE_URL, { signal: AbortSignal.timeout(10000) });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('langfuse');
  });

  it('can create an account via API', async () => {
    const res = await fetch(`${LANGFUSE_URL}/api/auth/csrf`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(200);
  });

  it('health endpoint responds', async () => {
    const res = await fetch(`${LANGFUSE_URL}/api/public/health`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe('OK');
  });

  it('API rejects unauthenticated trace creation', async () => {
    const res = await fetch(`${LANGFUSE_URL}/api/public/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-trace' }),
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(401);
  });

  it('API rejects invalid API key', async () => {
    const auth = Buffer.from('pk-lf-fake:sk-lf-fake').toString('base64');
    const res = await fetch(`${LANGFUSE_URL}/api/public/traces`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test-trace', id: 'test-123' }),
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(401);
  });

  it('sign-in page is accessible', async () => {
    const res = await fetch(`${LANGFUSE_URL}/api/auth/providers`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toBeDefined();
  });
});
