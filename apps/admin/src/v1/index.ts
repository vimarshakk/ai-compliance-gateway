import type { FastifyInstance } from 'fastify';
import { createOrganizationHandler, getOrganizationHandler, listOrganizationsHandler } from './organizations.js';
import { createProjectHandler, getProjectHandler, listProjectsHandler } from './projects.js';
import { createPolicyHandler, getPolicyHandler, listPoliciesHandler, updatePolicyHandler, deletePolicyHandler } from './policies.js';
import { createApiKeyHandler, listApiKeysHandler, revokeApiKeyHandler } from './api-keys.js';
import { listAuditLogsHandler, getAuditLogHandler } from './audit-logs.js';

export async function registerV1Routes(app: FastifyInstance) {
  await app.register(async (v1) => {
    v1.post('/organizations', createOrganizationHandler);
    v1.get('/organizations', listOrganizationsHandler);
    v1.get('/organizations/:id', getOrganizationHandler);

    v1.post('/projects', createProjectHandler);
    v1.get('/projects', listProjectsHandler);
    v1.get('/projects/:id', getProjectHandler);

    v1.post('/policies', createPolicyHandler);
    v1.get('/policies', listPoliciesHandler);
    v1.get('/policies/:id', getPolicyHandler);
    v1.put('/policies/:id', updatePolicyHandler);
    v1.delete('/policies/:id', deletePolicyHandler);

    v1.post('/api-keys', createApiKeyHandler);
    v1.get('/api-keys', listApiKeysHandler);
    v1.delete('/api-keys/:id', revokeApiKeyHandler);

    v1.get('/audit-logs', listAuditLogsHandler);
    v1.get('/audit-logs/:id', getAuditLogHandler);
  }, { prefix: '/v1' });
}
