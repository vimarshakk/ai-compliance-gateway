import type { FastifyInstance } from 'fastify';
import { createOrganizationHandler, getOrganizationHandler, listOrganizationsHandler } from './organizations.js';
import { createProjectHandler, getProjectHandler, listProjectsHandler } from './projects.js';
import { createPolicyHandler, getPolicyHandler, listPoliciesHandler, updatePolicyHandler, deletePolicyHandler } from './policies.js';
import { createApiKeyHandler, listApiKeysHandler, revokeApiKeyHandler } from './api-keys.js';
import { listAuditLogsHandler, getAuditLogHandler } from './audit-logs.js';
import { createComplianceScoreHandler, listComplianceScoresHandler, getComplianceScoreHandler, listScoreHistoryHandler } from './compliance-scores.js';
import { listProvidersHandler, getProviderHandler } from './providers.js';
import { scanProjectHandler, generateBomHandler, compliancePacksHandler } from './compliance-tools.js';
import { createSubscriptionHandler, getSubscriptionHandler, updateSubscriptionHandler, listSubscriptionsHandler, usageSummaryHandler } from './subscriptions.js';
import { listPacksHandler, getPackHandler, installPackHandler, uninstallPackHandler, searchPacksHandler, listPluginsHandler, validatePluginHandler, installPluginHandler, assignRoleHandler, checkPermissionHandler, queryAuditHandler, auditStatsHandler } from './marketplace.js';

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

    // Compliance Score History
    v1.post('/compliance/scores', createComplianceScoreHandler);
    v1.get('/compliance/scores', listComplianceScoresHandler);
    v1.get('/compliance/scores/:id', getComplianceScoreHandler);
    v1.get('/compliance/scores/history', listScoreHistoryHandler);

    // AI Provider Certification
    v1.get('/providers', listProvidersHandler);
    v1.get('/providers/:id', getProviderHandler);

    // Compliance Tools (scan, BOM, packs)
    v1.post('/tools/scan', scanProjectHandler);
    v1.post('/tools/bom', generateBomHandler);
    v1.get('/tools/packs', compliancePacksHandler);

    // Subscriptions & Billing
    v1.post('/subscriptions', createSubscriptionHandler);
    v1.get('/subscriptions', listSubscriptionsHandler);
    v1.get('/subscriptions/:organizationId', getSubscriptionHandler);
    v1.patch('/subscriptions/:organizationId', updateSubscriptionHandler);
    v1.get('/subscriptions/:organizationId/usage', usageSummaryHandler);

    // Marketplace
    v1.get('/marketplace/packs', listPacksHandler);
    v1.get('/marketplace/packs/search', searchPacksHandler);
    v1.get('/marketplace/packs/:name', getPackHandler);
    v1.post('/marketplace/packs/:name/install', installPackHandler);
    v1.post('/marketplace/packs/:name/uninstall', uninstallPackHandler);

    // Community Plugins
    v1.get('/marketplace/plugins', listPluginsHandler);
    v1.post('/marketplace/plugins/validate', validatePluginHandler);
    v1.post('/marketplace/plugins/install', installPluginHandler);

    // RBAC
    v1.post('/rbac/assign-role', assignRoleHandler);
    v1.get('/rbac/check-permission', checkPermissionHandler);

    // Audit
    v1.get('/audit/query', queryAuditHandler);
    v1.get('/audit/stats', auditStatsHandler);
  }, { prefix: '/v1' });
}
