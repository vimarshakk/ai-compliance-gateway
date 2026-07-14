import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { generateId } from '@acg/shared';
import type { Prisma } from '@prisma/client';

export async function createProjectHandler(
  request: FastifyRequest<{ Body: { name: string; organizationId: string; settings?: Record<string, unknown> } }>,
  reply: FastifyReply,
) {
  const { name, organizationId, settings } = request.body;
  const project = await prisma.project.create({
    data: {
      id: generateId(),
      name,
      organizationId,
      settings: (settings ?? {}) as Prisma.InputJsonValue,
    },
  });
  return reply.status(201).send(project);
}

export async function listProjectsHandler(
  request: FastifyRequest<{ Querystring: { organizationId?: string; limit?: number; offset?: number } }>,
  reply: FastifyReply,
) {
  const limit = request.query.limit ?? 50;
  const offset = request.query.offset ?? 0;
  const where = request.query.organizationId ? { organizationId: request.query.organizationId } : {};
  const [projects, total] = await Promise.all([
    prisma.project.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.project.count({ where }),
  ]);
  return reply.send({ projects, total, limit, offset });
}

export async function getProjectHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const project = await prisma.project.findUnique({ where: { id: request.params.id } });
  if (!project) return reply.status(404).send({ error: 'Not found' });
  return reply.send(project);
}
