import { PrismaClient } from '@acg/database';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface ApiKeyRecord {
  key: string;
  organizationId: string;
  projectId?: string;
  name: string;
  scopes: string[];
  enabled: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface ApiKeyStore {
  getByKey(key: string): Promise<ApiKeyRecord | undefined>;
  list(): Promise<ApiKeyRecord[]>;
  create(record: Omit<ApiKeyRecord, 'createdAt'>): Promise<ApiKeyRecord>;
  revoke(key: string): Promise<boolean>;
}

// Hybrid store: PostgreSQL-backed with in-memory cache for performance
export function createPrismaApiKeyStore(prisma: PrismaClient): ApiKeyStore {
  const cache = new Map<string, { record: ApiKeyRecord; expiresAt: number }>();
  const CACHE_TTL_MS = 60_000; // 1 minute cache

  async function dbToRecord(row: any): Promise<ApiKeyRecord> {
    return {
      key: row.keyHash,
      organizationId: row.organizationId,
      projectId: row.projectId ?? undefined,
      name: row.name,
      scopes: row.scopes ?? ['read'],
      enabled: row.enabled,
      expiresAt: row.expiresAt ?? undefined,
      lastUsedAt: row.lastUsedAt ?? undefined,
      createdAt: row.createdAt,
    };
  }

  return {
    async getByKey(key: string): Promise<ApiKeyRecord | undefined> {
      // Check cache first
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        const record = cached.record;
        if (!record.enabled) return undefined;
        if (record.expiresAt && record.expiresAt < new Date()) return undefined;
        return record;
      }

      // Query PostgreSQL
      try {
        const row = await prisma.apiKey.findFirst({
          where: { keyHash: key },
        });
        if (!row) return undefined;
        if (!row.enabled) return undefined;
        if (row.expiresAt && row.expiresAt < new Date()) return undefined;

        const record = await dbToRecord(row);

        // Update lastUsedAt in background
        prisma.apiKey.update({
          where: { id: row.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        // Cache it
        cache.set(key, { record, expiresAt: Date.now() + CACHE_TTL_MS });

        return record;
      } catch {
        return undefined;
      }
    },

    async list(): Promise<ApiKeyRecord[]> {
      try {
        const rows = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
        return Promise.all(rows.map(dbToRecord));
      } catch {
        return [];
      }
    },

    async create(record: Omit<ApiKeyRecord, 'createdAt'>): Promise<ApiKeyRecord> {
      const row = await prisma.apiKey.create({
        data: {
          organizationId: record.organizationId,
          projectId: record.projectId,
          name: record.name,
          keyHash: record.key,
          keyPrefix: record.key.slice(0, 8),
          scopes: record.scopes,
          enabled: record.enabled,
          expiresAt: record.expiresAt,
        },
      });
      const full = await dbToRecord(row);
      cache.set(record.key, { record: full, expiresAt: Date.now() + CACHE_TTL_MS });
      return full;
    },

    async revoke(key: string): Promise<boolean> {
      try {
        const row = await prisma.apiKey.findFirst({ where: { keyHash: key } });
        if (!row) return false;
        await prisma.apiKey.update({ where: { id: row.id }, data: { enabled: false } });
        cache.delete(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

// In-memory store for development/testing (no PostgreSQL required)
export function createApiKeyStore(): ApiKeyStore {
  const store = new Map<string, ApiKeyRecord>();

  const seedKeys: ApiKeyRecord[] = [
    {
      key: 'acg_test_key_development_001',
      organizationId: 'org-test-001',
      projectId: 'proj-test-001',
      name: 'Development Test Key',
      scopes: ['*'],
      enabled: true,
      createdAt: new Date(),
    },
    {
      key: 'acg_test_key_readonly_002',
      organizationId: 'org-test-002',
      name: 'Read-Only Test Key',
      scopes: ['read'],
      enabled: true,
      createdAt: new Date(),
    },
    {
      key: 'acg_test_key_disabled_003',
      organizationId: 'org-test-003',
      name: 'Disabled Test Key',
      scopes: ['*'],
      enabled: false,
      createdAt: new Date(),
    },
  ];

  for (const k of seedKeys) store.set(k.key, k);

  return {
    async getByKey(key: string) {
      const record = store.get(key);
      if (record && record.enabled) {
        if (record.expiresAt && record.expiresAt < new Date()) return undefined;
        record.lastUsedAt = new Date();
        return record;
      }
      return undefined;
    },
    async list() {
      return Array.from(store.values());
    },
    async create(record) {
      const full: ApiKeyRecord = { ...record, createdAt: new Date() };
      store.set(full.key, full);
      return full;
    },
    async revoke(key: string) {
      const record = store.get(key);
      if (record) {
        record.enabled = false;
        return true;
      }
      return false;
    },
  };
}

export async function apiKeyAuth(store: ApiKeyStore) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      return reply.status(401).send({
        error: {
          message: 'Missing X-Api-Key header',
          type: 'authentication_error',
          code: 'MISSING_API_KEY',
        },
      });
    }

    const record = await store.getByKey(apiKey);
    if (!record) {
      return reply.status(401).send({
        error: {
          message: 'Invalid or disabled API key',
          type: 'authentication_error',
          code: 'INVALID_API_KEY',
        },
      });
    }

    (request as any).apiKeyRecord = record;

    if (!request.headers['x-organization-id']) {
      reply.header('X-Organization-Id', record.organizationId);
    }
  };
}

export type ApiKeyAuthMiddleware = ReturnType<typeof apiKeyAuth>;
