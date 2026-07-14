import type { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'healthy', service: 'admin', timestamp: new Date().toISOString() };
  });

  app.get('/ready', async () => {
    return { status: 'ready', service: 'admin', timestamp: new Date().toISOString() };
  });
}
