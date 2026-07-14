import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface ComplianceScoreBody {
  organizationId: string;
  projectId?: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  breakdown?: Record<string, unknown>;
  pack?: string;
  scanResult?: Record<string, unknown>;
  bomResult?: Record<string, unknown>;
}

export async function createComplianceScoreHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ComplianceScoreBody;
  const { organizationId, projectId, overallScore, maxScore, percentage, breakdown, pack, scanResult, bomResult } = body;

  if (!organizationId || overallScore === undefined || maxScore === undefined) {
    return reply.status(400).send({ error: 'organizationId, overallScore, and maxScore are required' });
  }

  const prisma = (request.server as any).prisma;
  const record = await prisma.complianceScoreHistory.create({
    data: {
      organizationId,
      projectId: projectId ?? null,
      overallScore,
      maxScore,
      percentage,
      breakdown: breakdown ?? {},
      pack: pack ?? null,
      scanResult: scanResult ?? {},
      bomResult: bomResult ?? {},
    },
  });

  return reply.status(201).send(record);
}

export async function listComplianceScoresHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId, projectId, limit, offset } = request.query as {
    organizationId?: string;
    projectId?: string;
    limit?: string;
    offset?: string;
  };

  const prisma = (request.server as any).prisma;
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  if (projectId) where.projectId = projectId;

  const [scores, total] = await Promise.all([
    prisma.complianceScoreHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit ?? '50', 10),
      skip: parseInt(offset ?? '0', 10),
    }),
    prisma.complianceScoreHistory.count({ where }),
  ]);

  return reply.send({
    scores,
    total,
    limit: parseInt(limit ?? '50', 10),
    offset: parseInt(offset ?? '0', 10),
  });
}

export async function getComplianceScoreHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const prisma = (request.server as any).prisma;
  const score = await prisma.complianceScoreHistory.findUnique({ where: { id } });

  if (!score) {
    return reply.status(404).send({ error: 'Score not found' });
  }

  return reply.send(score);
}

export async function listScoreHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId, projectId, days } = request.query as {
    organizationId?: string;
    projectId?: string;
    days?: string;
  };

  const prisma = (request.server as any).prisma;
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  if (projectId) where.projectId = projectId;

  const daysNum = parseInt(days ?? '30', 10);
  const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
  where.createdAt = { gte: since };

  const history = await prisma.complianceScoreHistory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      overallScore: true,
      percentage: true,
      pack: true,
      createdAt: true,
    },
  });

  return reply.send({
    history,
    organizationId,
    projectId,
    days: daysNum,
  });
}
