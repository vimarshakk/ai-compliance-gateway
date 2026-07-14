/**
 * Governance Engine — Policy-as-code with approval workflows
 *
 * Manages organizational AI governance:
 * - Policy definitions (who can use what models, under what conditions)
 * - Approval workflows (high-risk requests require human approval)
 * - Access control (role-based model access)
 * - Cost governance (budgets, quotas, alerts)
 * - Audit trail (immutable governance decisions)
 */

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  priority: number;
  conditions: GovernanceCondition[];
  actions: GovernanceAction[];
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdBy: string;
  updatedBy: string;
}

export interface GovernanceCondition {
  type: 'role' | 'model' | 'provider' | 'cost' | 'time' | 'content' | 'org' | 'project';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'gt' | 'lt' | 'contains' | 'matches';
  value: string | string[] | number;
  negate?: boolean;
}

export interface GovernanceAction {
  type: 'allow' | 'deny' | 'require_approval' | 'log' | 'notify' | 'reroute' | 'quota_check';
  config?: Record<string, unknown>;
}

export interface GovernanceDecision {
  policyId: string;
  policyName: string;
  action: GovernanceAction;
  matched: boolean;
  reason: string;
  approvalRequired: boolean;
  approvers?: string[];
}

export interface ApprovalRequest {
  id: string;
  requestId: string;
  organizationId: string;
  userId: string;
  model: string;
  provider: string;
  promptPreview: string;
  riskScore: number;
  policyViolations: string[];
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: Date;
  expiresAt: Date;
  decidedAt?: string;
  decidedBy?: string;
  decision?: string;
}

export interface GovernanceContext {
  requestId: string;
  organizationId: string;
  projectId: string;
  userId: string;
  userRole: string;
  model: string;
  provider: string;
  messages: Array<{ role: string; content: string }>;
  estimatedCost: number;
  riskScore: number;
  compliancePacks: string[];
  timestamp: Date;
}

export interface GovernanceAuditEntry {
  id: string;
  timestamp: Date;
  organizationId: string;
  requestId: string;
  userId: string;
  action: string;
  policyId: string;
  details: Record<string, unknown>;
}

export class GovernanceEngine {
  private policies: Map<string, GovernancePolicy> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private auditLog: GovernanceAuditEntry[] = [];
  private quotas: Map<string, { used: number; limit: number; windowStart: number }> = new Map();

  constructor() {
    this.registerBuiltinPolicies();
  }

  addPolicy(policy: GovernancePolicy): void {
    this.policies.set(policy.id, policy);
  }

  removePolicy(id: string): void {
    this.policies.delete(id);
  }

  getPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  evaluate(context: GovernanceContext): GovernanceDecision[] {
    const decisions: GovernanceDecision[] = [];
    const now = new Date();

    const sortedPolicies = Array.from(this.policies.values())
      .filter((p) => p.enabled)
      .filter((p) => now >= p.effectiveFrom)
      .filter((p) => !p.effectiveUntil || now <= p.effectiveUntil)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      const allConditionsMet = policy.conditions.every((cond) => this.evaluateCondition(cond, context));

      if (allConditionsMet) {
        for (const action of policy.actions) {
          decisions.push({
            policyId: policy.id,
            policyName: policy.name,
            action,
            matched: true,
            reason: `Policy "${policy.name}" matched: ${policy.conditions.map((c) => `${c.type} ${c.operator} ${c.value}`).join(' AND ')}`,
            approvalRequired: action.type === 'require_approval',
          });

          this.auditLog.push({
            id: `gae_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: now,
            organizationId: context.organizationId,
            requestId: context.requestId,
            userId: context.userId,
            action: action.type,
            policyId: policy.id,
            details: {
              model: context.model,
              provider: context.provider,
              riskScore: context.riskScore,
            },
          });
        }
      }
    }

    return decisions;
  }

  requestApproval(context: GovernanceContext, violations: string[]): ApprovalRequest {
    const approval: ApprovalRequest = {
      id: `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      requestId: context.requestId,
      organizationId: context.organizationId,
      userId: context.userId,
      model: context.model,
      provider: context.provider,
      promptPreview: context.messages.map((m) => m.content).join('\n').slice(0, 500),
      riskScore: context.riskScore,
      policyViolations: violations,
      status: 'pending',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };

    this.pendingApprovals.set(approval.id, approval);
    return approval;
  }

  approveRequest(approvalId: string, approverId: string): ApprovalRequest | null {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval || approval.status !== 'pending') return null;

    approval.status = 'approved';
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = approverId;
    this.pendingApprovals.set(approvalId, approval);
    return approval;
  }

  denyRequest(approvalId: string, approverId: string, reason: string): ApprovalRequest | null {
    const approval = this.pendingApprovals.get(approvalId);
    if (!approval || approval.status !== 'pending') return null;

    approval.status = 'denied';
    approval.decidedAt = new Date().toISOString();
    approval.decidedBy = approverId;
    approval.decision = reason;
    this.pendingApprovals.set(approvalId, approval);
    return approval;
  }

  checkQuota(organizationId: string, limit: number, windowMs = 3600_000): { allowed: boolean; used: number; limit: number } {
    const key = `org:${organizationId}`;
    const now = Date.now();
    const quota = this.quotas.get(key);

    if (!quota || now - quota.windowStart > windowMs) {
      this.quotas.set(key, { used: 1, limit, windowStart: now });
      return { allowed: true, used: 1, limit };
    }

    if (quota.used >= limit) {
      return { allowed: false, used: quota.used, limit };
    }

    quota.used++;
    return { allowed: true, used: quota.used, limit };
  }

  getAuditLog(organizationId: string, limit = 100): GovernanceAuditEntry[] {
    return this.auditLog
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getPendingApprovals(organizationId: string): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values())
      .filter((a) => a.organizationId === organizationId && a.status === 'pending')
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  private evaluateCondition(condition: GovernanceCondition, context: GovernanceContext): boolean {
    let result = false;

    switch (condition.type) {
      case 'role':
        result = this.compare(condition.operator, context.userRole, condition.value);
        break;
      case 'model':
        result = this.compare(condition.operator, context.model, condition.value);
        break;
      case 'provider':
        result = this.compare(condition.operator, context.provider, condition.value);
        break;
      case 'cost':
        result = this.compare(condition.operator, context.estimatedCost, condition.value);
        break;
      case 'org':
        result = this.compare(condition.operator, context.organizationId, condition.value);
        break;
      case 'project':
        result = this.compare(condition.operator, context.projectId, condition.value);
        break;
      case 'time': {
        const hour = context.timestamp.getHours();
        result = this.compare(condition.operator, hour, condition.value);
        break;
      }
      case 'content': {
        const content = context.messages.map((m) => m.content).join(' ');
        result = this.compare(condition.operator, content, condition.value as string);
        break;
      }
    }

    return condition.negate ? !result : result;
  }

  private compare(operator: GovernanceCondition['operator'], actual: unknown, expected: unknown): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual as string);
      case 'not_in': return Array.isArray(expected) && !expected.includes(actual as string);
      case 'gt': return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'lt': return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'contains': return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
      case 'matches': return typeof actual === 'string' && typeof expected === 'string' && new RegExp(expected).test(actual);
      default: return false;
    }
  }

  private registerBuiltinPolicies(): void {
    this.addPolicy({
      id: 'gov-001',
      name: 'PHI Model Restriction',
      description: 'PHI data can only be sent to HIPAA-compliant providers',
      version: 1,
      enabled: true,
      priority: 100,
      conditions: [
        { type: 'content', operator: 'matches', value: '\\b\\d{3}-\\d{2}-\\d{4}\\b|\\bMRN\\b' },
      ],
      actions: [
        { type: 'require_approval' },
        { type: 'log', config: { level: 'warn' } },
      ],
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      updatedBy: 'system',
    });

    this.addPolicy({
      id: 'gov-002',
      name: 'Executive Model Access',
      description: 'GPT-4 and above requires director-level approval',
      version: 1,
      enabled: true,
      priority: 80,
      conditions: [
        { type: 'model', operator: 'in', value: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'claude-3-opus'] },
        { type: 'role', operator: 'not_in', value: ['director', 'admin', 'system'] },
      ],
      actions: [
        { type: 'require_approval' },
        { type: 'notify', config: { channel: 'slack', target: '#ai-governance' } },
      ],
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      updatedBy: 'system',
    });

    this.addPolicy({
      id: 'gov-003',
      name: 'Cost Guardrail',
      description: 'Requests exceeding $10 estimated cost require approval',
      version: 1,
      enabled: true,
      priority: 90,
      conditions: [
        { type: 'cost', operator: 'gt', value: 10 },
      ],
      actions: [
        { type: 'require_approval' },
        { type: 'log', config: { level: 'warn' } },
      ],
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      updatedBy: 'system',
    });

    this.addPolicy({
      id: 'gov-004',
      name: 'After-Hours Restriction',
      description: 'Non-emergency AI usage restricted outside business hours',
      version: 1,
      enabled: false,
      priority: 50,
      conditions: [
        { type: 'time', operator: 'lt', value: 8 },
        { type: 'time', operator: 'gt', value: 20 },
      ],
      actions: [
        { type: 'log', config: { level: 'info' } },
      ],
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      updatedBy: 'system',
    });
  }
}

export function createDefaultGovernanceEngine(): GovernanceEngine {
  return new GovernanceEngine();
}
