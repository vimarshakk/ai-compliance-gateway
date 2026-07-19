import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@acg/database';
import { generateId } from '@acg/shared';
import type { Prisma } from '@prisma/client';

interface AuditLogInput {
  organizationId: string;
  projectId?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  riskScore?: number;
}

export async function emitAuditLog(entry: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      id: generateId(),
      organizationId: entry.organizationId,
      projectId: entry.projectId,
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: (entry.details ?? {}) as Prisma.InputJsonValue,
      riskScore: entry.riskScore,
    },
  });
}

export async function listAuditLogsHandler(
  request: FastifyRequest<{ Querystring: { organizationId?: string; projectId?: string; action?: string; resource?: string; limit?: number; offset?: number; startDate?: string; endDate?: string } }>,
  reply: FastifyReply,
) {
  const limit = request.query.limit ?? 50;
  const offset = request.query.offset ?? 0;
  const where: Record<string, unknown> = {};
  if (request.query.organizationId) where.organizationId = request.query.organizationId;
  if (request.query.projectId) where.projectId = request.query.projectId;
  if (request.query.action) where.action = request.query.action;
  if (request.query.resource) where.resource = request.query.resource;
  if (request.query.startDate || request.query.endDate) {
    where.createdAt = {
      ...(request.query.startDate && { gte: new Date(request.query.startDate) }),
      ...(request.query.endDate && { lte: new Date(request.query.endDate) }),
    };
  }
  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.count({ where }),
  ]);
  return reply.send({ auditLogs, total, limit, offset });
}

export async function getAuditLogHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const log = await prisma.auditLog.findUnique({ where: { id: request.params.id } });
  if (!log) return reply.status(404).send({ error: 'Not found' });
  return reply.send(log);
}
