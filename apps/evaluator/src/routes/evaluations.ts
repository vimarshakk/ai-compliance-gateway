import type { FastifyInstance } from 'fastify';
import { generateId } from '@acg/shared';

export async function registerEvaluationRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      prompt: string;
      expectedOutput?: string;
      models: Array<{ provider: string; model: string }>;
      metrics: string[];
      compliancePack?: string;
      runs?: number;
    };
  }>('/v1/evaluations', async (request, reply) => {
    const evalId = generateId();
    const { prompt, expectedOutput, models, metrics, compliancePack, runs } = request.body;

    const results = models.map((m) => ({
      provider: m.provider,
      model: m.model,
      promptScore: 0,
      hallucinationScore: 0,
      latencyMs: 0,
      costEstimate: 0,
      complianceScore: 0,
      runs: runs ?? 1,
    }));

    return reply.status(201).send({
      evalId,
      status: 'completed',
      prompt,
      expectedOutput,
      compliancePack,
      metrics,
      results,
      summary: {
        bestModel: models[0]?.model ?? 'unknown',
        bestProvider: models[0]?.provider ?? 'unknown',
        avgLatency: 0,
        avgCost: 0,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get<{
    Querystring: { organizationId?: string; limit?: number; offset?: number };
  }>('/v1/evaluations', async (request, reply) => {
    return reply.send({ evaluations: [], total: 0, limit: request.query.limit ?? 50, offset: request.query.offset ?? 0 });
  });

  app.get<{
    Params: { id: string };
  }>('/v1/evaluations/:id', async (request, reply) => {
    return reply.status(404).send({ error: 'Not found' });
  });

  app.post<{
    Body: {
      prompt: string;
      models: Array<{ provider: string; model: string }>;
    };
  }>('/v1/evaluations/cost-analysis', async (request, reply) => {
    const { prompt, models } = request.body;
    return reply.send({
      promptTokens: Math.ceil(prompt.length / 4),
      costEstimates: models.map((m) => ({
        provider: m.provider,
        model: m.model,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
      })),
    });
  });
}
