import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { sha256 } from '@acg/shared';

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
  if (!apiKeyHeader) {
    return reply.status(401).send({ error: 'Missing X-API-Key header' });
  }

  const keyHash = sha256(apiKeyHeader);
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, enabled: true },
    include: { organization: true },
  });

  if (!apiKey) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return reply.status(401).send({ error: 'API key expired' });
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  (request as FastifyRequest & { apiKeyId: string; orgId: string; projectId?: string }).apiKeyId = apiKey.id;
  (request as FastifyRequest & { apiKeyId: string; orgId: string; projectId?: string }).orgId = apiKey.organizationId;
  (request as FastifyRequest & { apiKeyId: string; orgId: string; projectId?: string }).projectId = apiKey.projectId ?? undefined;
}
