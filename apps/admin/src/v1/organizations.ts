import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { generateId } from '@acg/shared';
import type { Prisma } from '@prisma/client';

export async function createOrganizationHandler(
  request: FastifyRequest<{ Body: { name: string; slug: string; compliancePack?: string; settings?: Record<string, unknown> } }>,
  reply: FastifyReply,
) {
  const { name, slug, compliancePack, settings } = request.body;
  const org = await prisma.organization.create({
    data: {
      id: generateId(),
      name,
      slug,
      compliancePacks: compliancePack ? [compliancePack] : [],
      settings: (settings ?? {}) as Prisma.InputJsonValue,
    },
  });
  return reply.status(201).send(org);
}

export async function listOrganizationsHandler(
  request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>,
  reply: FastifyReply,
) {
  const limit = request.query.limit ?? 50;
  const offset = request.query.offset ?? 0;
  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({ skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.organization.count(),
  ]);
  return reply.send({ organizations, total, limit, offset });
}

export async function getOrganizationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const org = await prisma.organization.findUnique({ where: { id: request.params.id } });
  if (!org) return reply.status(404).send({ error: 'Not found' });
  return reply.send(org);
}
