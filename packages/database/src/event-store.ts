import { prisma } from './index.js';
import { generateId } from '@acg/shared';
import type { DomainEvent, EventType } from './events.js';

export async function emitEvent(event: Omit<DomainEvent, 'id' | 'timestamp'>) {
  await prisma.auditLog.create({
    data: {
      id: generateId(),
      organizationId: event.metadata?.organizationId ?? 'system',
      projectId: event.metadata?.projectId,
      userId: event.metadata?.userId,
      action: event.type,
      resource: event.source,
      resourceId: event.metadata?.requestId,
      details: {
        ...event.data,
        source: event.source,
        correlationId: event.metadata?.correlationId,
      } as never,
      riskScore: computeRiskScore(event.type),
    },
  });
}

function computeRiskScore(type: EventType): number {
  if (type.includes('failed') || type.includes('blocked') || type.includes('invalid')) return 70;
  if (type.includes('violation') || type.includes('limit_reached')) return 90;
  if (type.includes('flagged')) return 60;
  if (type.includes('expired')) return 50;
  return 0;
}

export async function getEventStats(organizationId: string) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalEvents, recentEvents, highRiskEvents, topActions] = await Promise.all([
    prisma.auditLog.count({ where: { organizationId } }),
    prisma.auditLog.count({ where: { organizationId, createdAt: { gte: last24h } } }),
    prisma.auditLog.count({ where: { organizationId, riskScore: { gte: 60 }, createdAt: { gte: last7d } } }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { organizationId, createdAt: { gte: last7d } },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalEvents,
    recentEvents,
    highRiskEvents,
    topActions: topActions.map((a: { action: string; _count: number }) => ({ action: a.action, count: a._count })),
  };
}
