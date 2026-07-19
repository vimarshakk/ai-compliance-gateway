import type { FastifyInstance } from 'fastify';
import { registerRouterRoutes } from './router.js';
import { registerRiskRoutes } from './risk.js';
import { registerGovernanceRoutes } from './governance.js';
import { registerComplianceRoutes } from './compliance.js';

export async function registerEngineRoutes(app: FastifyInstance) {
  await app.register(async (engines) => {
    await engines.register(async (router) => {
      await registerRouterRoutes(router);
    }, { prefix: '/router' });

    await engines.register(async (risk) => {
      await registerRiskRoutes(risk);
    }, { prefix: '/risk' });

    await engines.register(async (governance) => {
      await registerGovernanceRoutes(governance);
    }, { prefix: '/governance' });

    await engines.register(async (compliance) => {
      await registerComplianceRoutes(compliance);
    }, { prefix: '/compliance' });
  }, { prefix: '/engines' });
}
