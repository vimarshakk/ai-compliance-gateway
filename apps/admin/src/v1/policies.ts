import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { generateId } from '@acg/shared';
import type { Prisma } from '@prisma/client';

export async function createPolicyHandler(
  request: FastifyRequest<{ Body: { organizationId: string; name: string; description?: string; type: string; rules: unknown[]; priority?: number } }>,
  reply: FastifyReply,
) {
  const { organizationId, name, description, type, rules, priority } = request.body;
  const policy = await prisma.policy.create({
    data: {
      id: generateId(),
      organizationId,
      name,
      description: description ?? '',
      type,
      rules: rules as Prisma.InputJsonValue,
      priority: priority ?? 0,
    },
  });
  return reply.status(201).send(policy);
}

export async function listPoliciesHandler(
  request: FastifyRequest<{ Querystring: { organizationId?: string; type?: string; enabled?: string; limit?: number; offset?: number } }>,
  reply: FastifyReply,
) {
  const limit = request.query.limit ?? 50;
  const offset = request.query.offset ?? 0;
  const where: Record<string, unknown> = {};
  if (request.query.organizationId) where.organizationId = request.query.organizationId;
  if (request.query.type) where.type = request.query.type;
  if (request.query.enabled !== undefined) where.enabled = request.query.enabled === 'true';
  const [policies, total] = await Promise.all([
    prisma.policy.findMany({ where, skip: offset, take: limit, orderBy: { priority: 'desc' } }),
    prisma.policy.count({ where }),
  ]);
  return reply.send({ policies, total, limit, offset });
}

export async function getPolicyHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const policy = await prisma.policy.findUnique({ where: { id: request.params.id } });
  if (!policy) return reply.status(404).send({ error: 'Not found' });
  return reply.send(policy);
}

export async function updatePolicyHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string; rules?: unknown[]; enabled?: boolean; priority?: number } }>,
  reply: FastifyReply,
) {
  const existing = await prisma.policy.findUnique({ where: { id: request.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Not found' });
  const data: Prisma.PolicyUpdateInput = {
    version: existing.version + 1,
  };
  if (request.body.name !== undefined) data.name = request.body.name;
  if (request.body.description !== undefined) data.description = request.body.description;
  if (request.body.rules !== undefined) data.rules = request.body.rules as Prisma.InputJsonValue;
  if (request.body.enabled !== undefined) data.enabled = request.body.enabled;
  if (request.body.priority !== undefined) data.priority = request.body.priority;
  const updated = await prisma.policy.update({ where: { id: request.params.id }, data });
  return reply.send(updated);
}

export async function deletePolicyHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await prisma.policy.delete({ where: { id: request.params.id } });
  } catch {
    return reply.status(404).send({ error: 'Not found' });
  }
  return reply.status(204).send();
}
