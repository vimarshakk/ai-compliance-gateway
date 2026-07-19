import type { FastifyInstance } from 'fastify';
import { getRiskEngine } from './registry.js';
import type { RiskContext } from '@acg/risk-engine';

export async function registerRiskRoutes(app: FastifyInstance) {
  app.get('/rules', async (_request, reply) => {
    const engine = getRiskEngine();
    const rules = (engine as any).rules ?? [];
    return reply.send({
      rules: rules.map((r: any) => ({ id: r.id, dimension: r.dimension, enabled: r.enabled })),
      total: rules.length,
    });
  });

  app.post('/rules', async (request, reply) => {
    const { id, dimension, enabled = true } = request.body as any;
    if (!id || !dimension) {
      return reply.status(400).send({ error: 'id and dimension are required' });
    }
    const engine = getRiskEngine();
    engine.addRule({
      id,
      dimension,
      enabled,
      condition: (ctx: RiskContext) => null,
    });
    return reply.status(201).send({ id, dimension, enabled, message: 'Rule added' });
  });

  app.delete('/rules/:id', async (request, reply) => {
    const engine = getRiskEngine();
    engine.removeRule((request.params as any).id);
    return reply.send({ message: 'Rule removed' });
  });

  app.get('/thresholds', async (_request, reply) => {
    const engine = getRiskEngine();
    const thresholds = (engine as any).thresholds ?? { low: 25, medium: 50, high: 75, critical: 90 };
    return reply.send({ thresholds });
  });

  app.post('/assess', async (request, reply) => {
    const engine = getRiskEngine();
    const ctx: RiskContext = {
      requestId: (request.body as any)?.requestId ?? 'admin_test',
      organizationId: (request.body as any)?.organizationId ?? 'admin',
      userId: (request.body as any)?.userId ?? 'admin',
      model: (request.body as any)?.model ?? 'gpt-4',
      provider: (request.body as any)?.provider ?? 'openai',
      messages: (request.body as any)?.messages ?? [{ role: 'user', content: 'test' }],
      piiEntities: (request.body as any)?.piiEntities ?? [],
      policyViolations: (request.body as any)?.policyViolations ?? [],
      compliancePacks: (request.body as any)?.compliancePacks ?? [],
    };
    const assessment = engine.assess(ctx);
    return reply.send({ assessment });
  });
}
