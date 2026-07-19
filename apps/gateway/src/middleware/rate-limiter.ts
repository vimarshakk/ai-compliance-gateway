import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyGenerator?: (request: FastifyRequest) => string;
  onBlock?: (request: FastifyRequest, key: string, retryAfter: number) => void;
}

export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();
  const { max, windowMs } = options;
  const keyGenerator = options.keyGenerator ?? ((req: FastifyRequest) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) return `apikey:${apiKey}`;
    const orgId = req.headers['x-organization-id'] as string;
    if (orgId) return `org:${orgId}`;
    return `ip:${req.ip}`;
  });

  // Cleanup expired entries every 30s
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 30000);

  const close = () => clearInterval(cleanupInterval);

  async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const key = keyGenerator(request);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      reply.header('X-Rate-Limit-Limit', max);
      reply.header('X-Rate-Limit-Remaining', max - 1);
      reply.header('X-Rate-Limit-Reset', Math.ceil((now + windowMs) / 1000));
      return;
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    const retryAfter = entry.resetAt - now;

    reply.header('X-Rate-Limit-Limit', max);
    reply.header('X-Rate-Limit-Remaining', remaining);
    reply.header('X-Rate-Limit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      reply.header('Retry-After', Math.ceil(retryAfter / 1000));
      options.onBlock?.(request, key, retryAfter);
      return reply.status(429).send({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(retryAfter / 1000),
        },
      });
    }
  }

  return { handler, close, store };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
