import { describe, it, expect } from 'vitest';
import { GovernanceEngine, createDefaultGovernanceEngine } from '../src/index.js';
import type { GovernanceContext } from '../src/index.js';

function makeContext(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    requestId: 'req_test_1',
    organizationId: 'org_1',
    projectId: 'proj_1',
    userId: 'user_1',
    userRole: 'viewer',
    model: 'gpt-4',
    provider: 'openai',
    messages: [{ role: 'user', content: 'Hello' }],
    estimatedCost: 0.01,
    riskScore: 10,
    compliancePacks: [],
    timestamp: new Date(),
    ...overrides,
  };
}

describe('GovernanceEngine', () => {
  const engine = createDefaultGovernanceEngine();

  it('returns decisions for a request', () => {
    const decisions = engine.evaluate(makeContext());
    expect(Array.isArray(decisions)).toBe(true);
    expect(decisions.length).toBeGreaterThan(0);
  });

  it('each decision has required fields', () => {
    const decisions = engine.evaluate(makeContext());
    for (const d of decisions) {
      expect(typeof d.policyId).toBe('string');
      expect(typeof d.policyName).toBe('string');
      expect(d.action).toBeDefined();
      expect(typeof d.matched).toBe('boolean');
      expect(typeof d.reason).toBe('string');
      expect(typeof d.approvalRequired).toBe('boolean');
    }
  });

  it('blocks non-executive from accessing restricted models', () => {
    const decisions = engine.evaluate(makeContext({
      userRole: 'viewer',
      model: 'gpt-4-turbo',
    }));
    // Viewer role should have a deny or require_approval
    const restrictive = decisions.filter((d) =>
      d.action.type === 'deny' || d.action.type === 'require_approval'
    );
    expect(restrictive.length).toBeGreaterThan(0);
  });

  it('allows admin role access (no restrictive decisions)', () => {
    const decisions = engine.evaluate(makeContext({
      userRole: 'admin',
      model: 'gpt-4',
    }));
    const restrictive = decisions.filter((d) =>
      d.action.type === 'deny' || d.action.type === 'require_approval'
    );
    expect(restrictive.length).toBe(0);
  });

  it('returns builtin policies', () => {
    const policies = engine.getPolicies();
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.some((p) => p.name.includes('PHI') || p.name.includes('phi') || p.name.includes('Healthcare'))).toBe(true);
  });

  it('adds and removes custom policies', () => {
    engine.addPolicy({
      id: 'custom_test',
      name: 'Test Policy',
      description: 'test',
      version: 1,
      enabled: true,
      priority: 100,
      conditions: [{ type: 'role', operator: 'equals', value: 'test' }],
      actions: [{ type: 'allow' }],
      effectiveFrom: new Date(),
      createdBy: 'test',
      updatedBy: 'test',
    });
    const policies = engine.getPolicies();
    expect(policies.some((p) => p.id === 'custom_test')).toBe(true);
    engine.removePolicy('custom_test');
    expect(engine.getPolicies().some((p) => p.id === 'custom_test')).toBe(false);
  });

  it('requests and tracks approvals', () => {
    const ctx = makeContext({ userRole: 'viewer', model: 'gpt-4-turbo' });
    const decisions = engine.evaluate(ctx);
    const approvalDecisions = decisions.filter((d) => d.action.type === 'require_approval');
    if (approvalDecisions.length > 0) {
      const approval = engine.requestApproval(ctx, approvalDecisions.map((d) => d.reason));
      expect(approval.status).toBe('pending');
      expect(typeof approval.id).toBe('string');
      expect(approval.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('approves a pending request', () => {
    const ctx = makeContext({ userRole: 'viewer', model: 'gpt-4-turbo' });
    const decisions = engine.evaluate(ctx);
    const approvalDecisions = decisions.filter((d) => d.action.type === 'require_approval');
    if (approvalDecisions.length > 0) {
      const approval = engine.requestApproval(ctx, approvalDecisions.map((d) => d.reason));
      const approved = engine.approveRequest(approval.id, 'approver_admin');
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe('approved');
      expect(approved!.decidedBy).toBe('approver_admin');
    }
  });

  it('denies a pending request', () => {
    const ctx = makeContext({ userRole: 'viewer', model: 'gpt-4-turbo' });
    const decisions = engine.evaluate(ctx);
    const approvalDecisions = decisions.filter((d) => d.action.type === 'require_approval');
    if (approvalDecisions.length > 0) {
      const approval = engine.requestApproval(ctx, approvalDecisions.map((d) => d.reason));
      const denied = engine.denyRequest(approval.id, 'admin', 'Not approved');
      expect(denied).not.toBeNull();
      expect(denied!.status).toBe('denied');
    }
  });

  it('returns null for non-existent approval', () => {
    expect(engine.approveRequest('nonexistent', 'admin')).toBeNull();
    expect(engine.denyRequest('nonexistent', 'admin', 'reason')).toBeNull();
  });

  it('checks quotas', () => {
    const q1 = engine.checkQuota('org_1', 3);
    expect(q1.allowed).toBe(true);
    expect(q1.used).toBe(1);
    engine.checkQuota('org_1', 3);
    engine.checkQuota('org_1', 3);
    const q4 = engine.checkQuota('org_1', 3);
    expect(q4.allowed).toBe(false);
    expect(q4.used).toBe(3);
  });

  it('returns pending approvals for org', () => {
    const pending = engine.getPendingApprovals('org_1');
    expect(Array.isArray(pending)).toBe(true);
  });

  it('returns audit log for org', () => {
    const log = engine.getAuditLog('org_1');
    expect(Array.isArray(log)).toBe(true);
  });
});
