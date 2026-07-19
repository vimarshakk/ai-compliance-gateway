import type { FastifyInstance } from 'fastify';
import { getComplianceEngine } from './registry.js';
import type { ComplianceContext } from '@acg/compliance-engine';

export async function registerComplianceRoutes(app: FastifyInstance) {
  app.get('/packs', async (_request, reply) => {
    const engine = getComplianceEngine();
    const packs = engine.getPacks();
    return reply.send({
      packs: packs.map((p) => ({
        id: p.id, name: p.name, fullName: p.fullName, version: p.version,
        description: p.description, enabled: p.enabled,
        ruleCount: p.rules.length, classificationCount: p.dataClassifications.length,
      })),
      total: packs.length,
    });
  });

  app.get('/packs/:id', async (request, reply) => {
    const engine = getComplianceEngine();
    const packs = engine.getPacks();
    const pack = packs.find((p) => p.id === (request.params as any).id);
    if (!pack) return reply.status(404).send({ error: 'Pack not found' });
    return reply.send({
      ...pack,
      rules: pack.rules.map((r) => ({ id: r.id, name: r.name, description: r.description, severity: r.severity, category: r.category })),
    });
  });

  app.post('/evaluate', async (request, reply) => {
    const engine = getComplianceEngine();
    const body = request.body as any;
    const ctx: ComplianceContext = {
      requestId: body?.requestId ?? 'admin_test',
      organizationId: body?.organizationId ?? 'admin',
      userId: body?.userId ?? 'admin',
      model: body?.model ?? 'gpt-4',
      provider: body?.provider ?? 'openai',
      messages: body?.messages ?? [{ role: 'user', content: 'test' }],
      piiDetected: body?.piiDetected ?? [],
      dataFlow: body?.dataFlow ?? 'internal',
      encryptionInTransit: body?.encryptionInTransit ?? true,
      encryptionAtRest: body?.encryptionAtRest ?? true,
      timestamp: new Date(),
    };

    if (body?.packId) {
      try {
        const report = engine.evaluate(body.packId, ctx);
        return reply.send({ report });
      } catch (err) {
        return reply.status(404).send({ error: (err as Error).message });
      }
    }

    const reports = engine.evaluateAll(ctx);
    return reply.send({ reports, total: reports.length });
  });
}
