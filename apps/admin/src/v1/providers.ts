import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function listProvidersHandler(request: FastifyRequest, reply: FastifyReply) {
  const { certified, compliance, limit, offset } = request.query as {
    certified?: string;
    compliance?: string;
    limit?: string;
    offset?: string;
  };

  const prisma = (request.server as any).prisma;
  const where: any = {};
  if (certified === 'true') where.certified = true;

  const providers = await prisma.aiProvider.findMany({
    where,
    orderBy: { name: 'asc' },
    take: parseInt(limit ?? '100', 10),
    skip: parseInt(offset ?? '0', 10),
  });

  // Filter by compliance feature if specified
  let filtered = providers;
  if (compliance) {
    const feature = compliance.toLowerCase();
    filtered = providers.filter((p: any) => {
      const features = p.complianceFeatures as Record<string, boolean>;
      return features?.[feature] === true;
    });
  }

  return reply.send({ providers: filtered, total: filtered.length });
}

export async function getProviderHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const prisma = (request.server as any).prisma;

  // Try slug first, then ID
  let provider = await prisma.aiProvider.findUnique({ where: { slug: id } });
  if (!provider) {
    provider = await prisma.aiProvider.findUnique({ where: { id } });
  }

  if (!provider) {
    return reply.status(404).send({ error: 'Provider not found' });
  }

  return reply.send(provider);
}
