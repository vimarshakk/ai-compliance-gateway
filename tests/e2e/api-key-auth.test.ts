import { describe, it, expect, beforeEach } from 'vitest';
import { createApiKeyStore, apiKeyAuth } from '../../apps/gateway/src/middleware/api-key-auth.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

function createMockRequest(headers: Record<string, string> = {}): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply & { _headers: Record<string, unknown>; _status?: number; _body?: unknown } {
  const reply = {
    _headers: {} as Record<string, unknown>,
    _status: undefined as number | undefined,
    _body: undefined as unknown,
    header(key: string, value: unknown) { reply._headers[key] = value; return reply; },
    status(code: number) { reply._status = code; return reply; },
    send(body: unknown) { reply._body = body; return reply; },
  } as unknown as FastifyReply & { _headers: Record<string, unknown>; _status?: number; _body?: unknown };
  return reply;
}

describe('ApiKeyStore', () => {
  let store: ReturnType<typeof createApiKeyStore>;

  beforeEach(() => {
    store = createApiKeyStore();
  });

  it('has seeded test keys', async () => {
    const keys = await store.list();
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it('validates a known key', async () => {
    const record = await store.getByKey('acg_test_key_development_001');
    expect(record).toBeDefined();
    expect(record!.organizationId).toBe('org-test-001');
    expect(record!.enabled).toBe(true);
  });

  it('rejects unknown key', async () => {
    const record = await store.getByKey('acg_nonexistent_key');
    expect(record).toBeUndefined();
  });

  it('rejects disabled key', async () => {
    const record = await store.getByKey('acg_test_key_disabled_003');
    expect(record).toBeUndefined();
  });

  it('creates and retrieves a new key', async () => {
    const newKey = await store.create({
      key: 'acg_custom_key_123',
      organizationId: 'org-custom',
      name: 'Custom Key',
      scopes: ['read', 'write'],
      enabled: true,
    });
    expect(newKey.createdAt).toBeDefined();

    const retrieved = await store.getByKey('acg_custom_key_123');
    expect(retrieved).toBeDefined();
    expect(retrieved!.organizationId).toBe('org-custom');
  });

  it('revokes a key', async () => {
    const revoked = await store.revoke('acg_test_key_development_001');
    expect(revoked).toBe(true);
    expect(await store.getByKey('acg_test_key_development_001')).toBeUndefined();
  });

  it('returns false when revoking nonexistent key', async () => {
    expect(await store.revoke('nonexistent')).toBe(false);
  });
});

describe('ApiKeyAuth Middleware', () => {
  let store: ReturnType<typeof createApiKeyStore>;
  let authFn: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

  beforeEach(async () => {
    store = createApiKeyStore();
    authFn = await apiKeyAuth(store);
  });

  it('allows valid API key', async () => {
    const req = createMockRequest({ 'x-api-key': 'acg_test_key_development_001' });
    const reply = createMockReply();
    await authFn(req, reply);
    expect(reply._status).toBeUndefined();
    expect((req as any).apiKeyRecord).toBeDefined();
    expect((req as any).apiKeyRecord.organizationId).toBe('org-test-001');
  });

  it('rejects missing API key', async () => {
    const req = createMockRequest({});
    const reply = createMockReply();
    await authFn(req, reply);
    expect(reply._status).toBe(401);
    expect((reply._body as any).error.code).toBe('MISSING_API_KEY');
  });

  it('rejects invalid API key', async () => {
    const req = createMockRequest({ 'x-api-key': 'acg_invalid_key' });
    const reply = createMockReply();
    await authFn(req, reply);
    expect(reply._status).toBe(401);
    expect((reply._body as any).error.code).toBe('INVALID_API_KEY');
  });

  it('rejects disabled API key', async () => {
    const req = createMockRequest({ 'x-api-key': 'acg_test_key_disabled_003' });
    const reply = createMockReply();
    await authFn(req, reply);
    expect(reply._status).toBe(401);
  });
});
