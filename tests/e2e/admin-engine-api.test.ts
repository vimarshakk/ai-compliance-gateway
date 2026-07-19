import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerEngineRoutes } from '@acg/admin/engines/index.js';
import { resetAllEngines } from '@acg/admin/engines/registry.js';

let app: FastifyInstance;
const BASE = '/engines';

beforeAll(async () => {
  resetAllEngines();
  app = Fastify({ logger: false });
  await app.register(import('@fastify/cors'), { origin: '*' });
  await registerEngineRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app?.close();
});

describe('Admin Engine API — HTTP Integration', () => {
  // ── AI Router ──────────────────────────────────────────────

  describe('GET /engines/router/health', () => {
    it('returns provider health status', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/router/health` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toMatch(/^(healthy|degraded)$/);
      expect(body.providers).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(4);
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /engines/router/providers', () => {
    it('lists all registered providers', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/router/providers` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.providers).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(4);
      for (const p of body.providers) {
        expect(p.provider).toBeDefined();
        expect(typeof p.healthy).toBe('boolean');
        expect(typeof p.failureCount).toBe('number');
      }
    });
  });

  describe('GET /engines/router/providers/:id', () => {
    it('returns specific provider', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/router/providers/openai` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.provider).toBe('OpenAI');
    });

    it('returns 404 for unknown provider', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/router/providers/nonexistent` });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /engines/router/reset-circuit-breakers', () => {
    it('resets all circuit breakers', async () => {
      const res = await app.inject({ method: 'POST', url: `${BASE}/router/reset-circuit-breakers` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toBe('Circuit breakers reset');
      expect(body.timestamp).toBeDefined();
    });
  });

  // ── Risk Engine ────────────────────────────────────────────

  describe('GET /engines/risk/rules', () => {
    it('lists risk rules', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/risk/rules` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rules).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /engines/risk/rules', () => {
    it('adds a new risk rule', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/risk/rules`,
        payload: { id: 'test-rule-http', dimension: 'security', enabled: true },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBe('test-rule-http');
    });

    it('rejects rule without required fields', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/risk/rules`,
        payload: { id: 'missing-dim' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /engines/risk/rules/:id', () => {
    it('removes a risk rule', async () => {
      const res = await app.inject({ method: 'DELETE', url: `${BASE}/risk/rules/test-rule-http` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toBe('Rule removed');
    });
  });

  describe('GET /engines/risk/thresholds', () => {
    it('returns risk thresholds', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/risk/thresholds` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.thresholds.low).toBe(25);
      expect(body.thresholds.medium).toBe(50);
      expect(body.thresholds.high).toBe(75);
      expect(body.thresholds.critical).toBe(90);
    });
  });

  describe('POST /engines/risk/assess', () => {
    it('assesses a clean request', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/risk/assess`,
        payload: {
          requestId: 'http-test-1',
          organizationId: 'org-http',
          userId: 'user-http',
          model: 'gpt-4',
          provider: 'openai',
          messages: [{ role: 'user', content: 'Hello world' }],
          piiEntities: [],
          policyViolations: [],
          compliancePacks: [],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.assessment.compositeScore).toBeLessThan(25);
      expect(body.assessment.riskLevel).toBe('low');
      expect(body.assessment.recommendation).toBe('allow');
    });

    it('assesses a PII-heavy request as higher risk', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/risk/assess`,
        payload: {
          requestId: 'http-test-2',
          organizationId: 'org-http',
          userId: 'user-http',
          model: 'gpt-4',
          provider: 'openai',
          messages: [{ role: 'user', content: 'Patient John SSN 123-45-6789' }],
          piiEntities: [
            { type: 'SSN', confidence: 0.99, value: '123-45-6789' },
            { type: 'NAME', confidence: 0.98, value: 'John' },
          ],
          policyViolations: [],
          compliancePacks: [],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.assessment.compositeScore).toBeGreaterThan(0);
      const piiDim = body.assessment.dimensions.find((d: any) => d.name === 'pii');
      expect(piiDim.score).toBeGreaterThan(0);
    });
  });

  // ── Governance Engine ──────────────────────────────────────

  describe('GET /engines/governance/policies', () => {
    it('lists governance policies', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/policies` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.policies).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(4);
    });
  });

  describe('GET /engines/governance/policies/:id', () => {
    it('returns specific policy', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/policies/gov-001` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe('gov-001');
      expect(body.name).toBe('PHI Model Restriction');
    });

    it('returns 404 for unknown policy', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/policies/gov-999` });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /engines/governance/policies', () => {
    it('creates a new policy', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/governance/policies`,
        payload: {
          id: 'gov-http-test',
          name: 'HTTP Test Policy',
          description: 'Created via HTTP integration test',
          enabled: true,
          priority: 75,
          conditions: [{ type: 'role', operator: 'equals', value: 'test' }],
          actions: [{ type: 'allow' }],
          effectiveFrom: new Date().toISOString(),
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBe('gov-http-test');
    });

    it('rejects policy without required fields', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/governance/policies`,
        payload: { description: 'missing id and name' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /engines/governance/policies/:id', () => {
    it('removes a policy', async () => {
      const res = await app.inject({ method: 'DELETE', url: `${BASE}/governance/policies/gov-http-test` });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /engines/governance/approvals', () => {
    it('lists pending approvals', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/approvals` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.approvals).toBeInstanceOf(Array);
    });
  });

  describe('POST /engines/governance/evaluate', () => {
    it('evaluates governance policies', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/governance/evaluate`,
        payload: {
          requestId: 'gov-http-eval',
          organizationId: 'org-http',
          projectId: 'proj-http',
          userId: 'user-http',
          userRole: 'engineer',
          model: 'gpt-4',
          provider: 'openai',
          messages: [{ role: 'user', content: 'Test' }],
          estimatedCost: 0.05,
          riskScore: 10,
          compliancePacks: [],
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.decisions).toBeInstanceOf(Array);
      // Engineer requesting GPT-4 should trigger Executive Model Access
      const approvalDecision = body.decisions.find((d: any) => d.action.type === 'require_approval');
      expect(approvalDecision).toBeDefined();
    });
  });

  describe('GET /engines/governance/quotas', () => {
    it('checks quota for organization', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/quotas?organizationId=org-quota-http&limit=5` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.quota.allowed).toBe(true);
      expect(body.organizationId).toBe('org-quota-http');
    });
  });

  describe('GET /engines/governance/audit-log', () => {
    it('returns audit log entries', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/governance/audit-log?organizationId=admin` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.entries).toBeInstanceOf(Array);
    });
  });

  // ── Compliance Engine ──────────────────────────────────────

  describe('GET /engines/compliance/packs', () => {
    it('lists compliance packs', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/compliance/packs` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.packs).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('GET /engines/compliance/packs/:id', () => {
    it('returns HIPAA pack details', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/compliance/packs/hipaa` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe('hipaa');
      expect(body.rules).toBeInstanceOf(Array);
      expect(body.rules.length).toBeGreaterThan(0);
    });

    it('returns 404 for unknown pack', async () => {
      const res = await app.inject({ method: 'GET', url: `${BASE}/compliance/packs/nonexistent` });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /engines/compliance/evaluate', () => {
    it('evaluates a specific compliance pack', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/compliance/evaluate`,
        payload: {
          packId: 'hipaa',
          requestId: 'comp-http-1',
          organizationId: 'org-http',
          userId: 'user-http',
          model: 'gpt-4',
          provider: 'openai',
          messages: [{ role: 'user', content: 'Analyze results' }],
          piiDetected: [],
          dataFlow: 'internal',
          encryptionInTransit: true,
          encryptionAtRest: true,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.report.packName).toBe('HIPAA');
      expect(body.report.overallStatus).toBe('compliant');
      expect(body.report.score).toBe(100);
    });

    it('evaluates all enabled packs', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/compliance/evaluate`,
        payload: {
          requestId: 'comp-http-2',
          organizationId: 'org-http',
          userId: 'user-http',
          model: 'gpt-4',
          provider: 'openai',
          messages: [{ role: 'user', content: 'Test' }],
          piiDetected: [],
          dataFlow: 'internal',
          encryptionInTransit: true,
          encryptionAtRest: true,
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.reports).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(2);
    });

    it('returns 404 for unknown pack', async () => {
      const res = await app.inject({
        method: 'POST', url: `${BASE}/compliance/evaluate`,
        payload: { packId: 'nonexistent', organizationId: 'org-http' },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
