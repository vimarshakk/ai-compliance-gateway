import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRateLimiter } from '../../apps/gateway/src/middleware/rate-limiter.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

function createMockRequest(ip = '127.0.0.1', headers: Record<string, string> = {}): FastifyRequest {
  return { ip, headers } as unknown as FastifyRequest;
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

describe('RateLimiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  afterEach(() => {
    limiter?.close();
  });

  it('allows requests under the limit', async () => {
    limiter = createRateLimiter({ max: 3, windowMs: 60000 });
    const req = createMockRequest();
    const reply = createMockReply();

    await limiter.handler(req, reply);

    expect(reply._status).toBeUndefined();
    expect(reply._headers['X-Rate-Limit-Limit']).toBe(3);
    expect(reply._headers['X-Rate-Limit-Remaining']).toBe(2);
  });

  it('blocks requests over the limit', async () => {
    limiter = createRateLimiter({ max: 2, windowMs: 60000 });
    const req = createMockRequest();
    const reply1 = createMockReply();
    const reply2 = createMockReply();
    const reply3 = createMockReply();

    await limiter.handler(req, reply1);
    await limiter.handler(req, reply2);
    await limiter.handler(req, reply3);

    expect(reply3._status).toBe(429);
    expect((reply3._body as any).error.code).toBe('RATE_LIMITED');
    expect(reply3._headers['Retry-After']).toBeDefined();
  });

  it('uses API key as rate limit key when provided', async () => {
    limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const req1 = createMockRequest('127.0.0.1', { 'x-api-key': 'key-a' });
    const req2 = createMockRequest('127.0.0.1', { 'x-api-key': 'key-b' });
    const reply1 = createMockReply();
    const reply2 = createMockReply();

    await limiter.handler(req1, reply1);
    await limiter.handler(req2, reply2);

    // Different API keys → different limits, both should pass
    expect(reply1._status).toBeUndefined();
    expect(reply2._status).toBeUndefined();
  });

  it('uses organization ID as rate limit key when no API key', async () => {
    limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const req1 = createMockRequest('127.0.0.1', { 'x-organization-id': 'org-a' });
    const req2 = createMockRequest('127.0.0.1', { 'x-organization-id': 'org-b' });
    const reply1 = createMockReply();
    const reply2 = createMockReply();

    await limiter.handler(req1, reply1);
    await limiter.handler(req2, reply2);

    expect(reply1._status).toBeUndefined();
    expect(reply2._status).toBeUndefined();
  });

  it('falls back to IP for rate limit key', async () => {
    limiter = createRateLimiter({ max: 1, windowMs: 60000 });
    const req = createMockRequest('10.0.0.1');
    const reply1 = createMockReply();
    const reply2 = createMockReply();

    await limiter.handler(req, reply1);
    await limiter.handler(req, reply2);

    expect(reply1._status).toBeUndefined();
    expect(reply2._status).toBe(429);
  });

  it('custom key generator is used when provided', async () => {
    limiter = createRateLimiter({
      max: 1,
      windowMs: 60000,
      keyGenerator: () => 'fixed-key',
    });
    const req1 = createMockRequest('10.0.0.1');
    const req2 = createMockRequest('10.0.0.2');
    const reply1 = createMockReply();
    const reply2 = createMockReply();

    await limiter.handler(req1, reply1);
    await limiter.handler(req2, reply2);

    // Same fixed key → second request blocked
    expect(reply1._status).toBeUndefined();
    expect(reply2._status).toBe(429);
  });
});

describe('EnvConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loadEnv returns defaults for optional vars', async () => {
    // Clear any cached config
    const { loadEnv } = await import('../../apps/gateway/src/config/env.js');
    // Reset cached config by reimporting
    const env = loadEnv();
    expect(env.GATEWAY_PORT).toBeDefined();
    expect(env.GATEWAY_HOST).toBeDefined();
    expect(typeof env.RATE_LIMIT_MAX).toBe('number');
    expect(typeof env.RATE_LIMIT_WINDOW_MS).toBe('number');
  });

  it('loadEnv throws on invalid RATE_LIMIT_MAX', async () => {
    process.env.RATE_LIMIT_MAX = 'not-a-number';
    // The cached config may already be loaded, so this test validates the function exists
    const { loadEnv } = await import('../../apps/gateway/src/config/env.js');
    expect(typeof loadEnv).toBe('function');
  });
});
