import type { FastifyInstance } from 'fastify';
import { getGovernanceEngine } from './registry.js';
import type { GovernanceContext } from '@acg/governance-engine';

export async function registerGovernanceRoutes(app: FastifyInstance) {
  app.get('/policies', async (_request, reply) => {
    const engine = getGovernanceEngine();
    const policies = engine.getPolicies();
    return reply.send({
      policies: policies.map((p) => ({
        id: p.id, name: p.name, description: p.description, version: p.version,
        enabled: p.enabled, priority: p.priority, conditionCount: p.conditions.length,
        actionCount: p.actions.length, effectiveFrom: p.effectiveFrom, effectiveUntil: p.effectiveUntil,
      })),
      total: policies.length,
    });
  });

  app.get('/policies/:id', async (request, reply) => {
    const engine = getGovernanceEngine();
    const policies = engine.getPolicies();
    const policy = policies.find((p) => p.id === (request.params as any).id);
    if (!policy) return reply.status(404).send({ error: 'Policy not found' });
    return reply.send(policy);
  });

  app.post('/policies', async (request, reply) => {
    const body = request.body as any;
    if (!body?.id || !body?.name) {
      return reply.status(400).send({ error: 'id and name are required' });
    }
    const engine = getGovernanceEngine();
    engine.addPolicy({
      id: body.id,
      name: body.name,
      description: body.description ?? '',
      version: body.version ?? 1,
      enabled: body.enabled ?? true,
      priority: body.priority ?? 50,
      conditions: body.conditions ?? [],
      actions: body.actions ?? [{ type: 'allow' }],
      effectiveFrom: new Date(body.effectiveFrom ?? Date.now()),
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : undefined,
      createdBy: body.createdBy ?? 'admin',
      updatedBy: body.updatedBy ?? 'admin',
    });
    return reply.status(201).send({ id: body.id, message: 'Policy created' });
  });

  app.delete('/policies/:id', async (request, reply) => {
    const engine = getGovernanceEngine();
    engine.removePolicy((request.params as any).id);
    return reply.send({ message: 'Policy removed' });
  });

  app.get('/approvals', async (request, reply) => {
    const engine = getGovernanceEngine();
    const orgId = (request.query as any)?.organizationId ?? 'admin';
    const pending = engine.getPendingApprovals(orgId);
    return reply.send({ approvals: pending, total: pending.length });
  });

  app.post('/approvals/:id/approve', async (request, reply) => {
    const engine = getGovernanceEngine();
    const { approverId } = (request.body as any) ?? {};
    const result = engine.approveRequest((request.params as any).id, approverId ?? 'admin');
    if (!result) return reply.status(404).send({ error: 'Approval not found or already decided' });
    return reply.send({ approval: result });
  });

  app.post('/approvals/:id/deny', async (request, reply) => {
    const engine = getGovernanceEngine();
    const { approverId, reason } = (request.body as any) ?? {};
    const result = engine.denyRequest((request.params as any).id, approverId ?? 'admin', reason ?? 'Denied by admin');
    if (!result) return reply.status(404).send({ error: 'Approval not found or already decided' });
    return reply.send({ approval: result });
  });

  app.get('/quotas', async (request, reply) => {
    const engine = getGovernanceEngine();
    const orgId = (request.query as any)?.organizationId ?? 'admin';
    const limit = parseInt((request.query as any)?.limit ?? '1000', 10);
    const result = engine.checkQuota(orgId, limit);
    return reply.send({ quota: result, organizationId: orgId });
  });

  app.get('/audit-log', async (request, reply) => {
    const engine = getGovernanceEngine();
    const orgId = (request.query as any)?.organizationId ?? 'admin';
    const limit = parseInt((request.query as any)?.limit ?? '50', 10);
    const log = engine.getAuditLog(orgId, limit);
    return reply.send({ entries: log, total: log.length });
  });

  app.post('/evaluate', async (request, reply) => {
    const engine = getGovernanceEngine();
    const body = request.body as any;
    const ctx: GovernanceContext = {
      requestId: body?.requestId ?? 'admin_test',
      organizationId: body?.organizationId ?? 'admin',
      projectId: body?.projectId ?? 'default',
      userId: body?.userId ?? 'admin',
      userRole: body?.userRole ?? 'admin',
      model: body?.model ?? 'gpt-4',
      provider: body?.provider ?? 'openai',
      messages: body?.messages ?? [{ role: 'user', content: 'test' }],
      estimatedCost: body?.estimatedCost ?? 0.01,
      riskScore: body?.riskScore ?? 10,
      compliancePacks: body?.compliancePacks ?? [],
      timestamp: new Date(),
    };
    const decisions = engine.evaluate(ctx);
    return reply.send({ decisions, total: decisions.length });
  });
}
