import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { generateId, sha256 } from '@acg/shared';
import crypto from 'crypto';

export async function createApiKeyHandler(
  request: FastifyRequest<{ Body: { organizationId: string; name: string; projectId?: string; scopes?: string[]; expiresAt?: string } }>,
  reply: FastifyReply,
) {
  const { organizationId, name, projectId, scopes, expiresAt } = request.body;
  const rawKey = `acg_${crypto.randomBytes(32).toString('hex')}`;
  const apiKey = await prisma.apiKey.create({
    data: {
      id: generateId(),
      organizationId,
      projectId,
      name,
      keyHash: sha256(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      scopes: scopes ?? ['read'],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return reply.status(201).send({ ...apiKey, key: rawKey });
}

export async function listApiKeysHandler(
  request: FastifyRequest<{ Querystring: { organizationId?: string } }>,
  reply: FastifyReply,
) {
  const where = request.query.organizationId ? { organizationId: request.query.organizationId } : {};
  const apiKeys = await prisma.apiKey.findMany({ where, orderBy: { createdAt: 'desc' } });
  return reply.send({ apiKeys: apiKeys.map((k: typeof apiKeys[number]) => ({ ...k, key: undefined })), total: apiKeys.length });
}

export async function revokeApiKeyHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await prisma.apiKey.delete({ where: { id: request.params.id } });
  } catch {
    return reply.status(404).send({ error: 'Not found' });
  }
  return reply.status(204).send();
}
