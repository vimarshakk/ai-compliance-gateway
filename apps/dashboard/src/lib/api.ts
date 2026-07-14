const BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Organizations
export interface Organization {
  id: string;
  name: string;
  slug: string;
  compliancePacks: string[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export const orgs = {
  list: () => request<{ organizations: Organization[]; total: number }>('GET', '/v1/organizations'),
  get: (id: string) => request<Organization>('GET', `/v1/organizations/${id}`),
  create: (data: { name: string; slug: string; compliancePack?: string }) =>
    request<Organization>('POST', '/v1/organizations', data),
};

// Projects
export interface Project {
  id: string;
  name: string;
  organizationId: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export const projects = {
  list: (orgId?: string) =>
    request<{ projects: Project[]; total: number }>('GET', `/v1/projects${orgId ? `?organizationId=${orgId}` : ''}`),
  get: (id: string) => request<Project>('GET', `/v1/projects/${id}`),
  create: (data: { name: string; organizationId: string }) =>
    request<Project>('POST', '/v1/projects', data),
};

// Policies
export interface Policy {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: string;
  rules: unknown[];
  enabled: boolean;
  priority: number;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export const policies = {
  list: (orgId?: string) =>
    request<{ policies: Policy[]; total: number }>('GET', `/v1/policies${orgId ? `?organizationId=${orgId}` : ''}`),
  get: (id: string) => request<Policy>('GET', `/v1/policies/${id}`),
  create: (data: { organizationId: string; name: string; description?: string; type: string; rules: unknown[] }) =>
    request<Policy>('POST', '/v1/policies', data),
  update: (id: string, data: Partial<Policy>) => request<Policy>('PUT', `/v1/policies/${id}`, data),
  remove: (id: string) => request<void>('DELETE', `/v1/policies/${id}`),
};

// API Keys
export interface ApiKey {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  enabled: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}
export const apiKeys = {
  list: (orgId?: string) =>
    request<{ apiKeys: ApiKey[]; total: number }>('GET', `/v1/api-keys${orgId ? `?organizationId=${orgId}` : ''}`),
  create: (data: { organizationId: string; name: string; projectId?: string; scopes?: string[] }) =>
    request<ApiKey & { key: string }>('POST', '/v1/api-keys', data),
  revoke: (id: string) => request<void>('DELETE', `/v1/api-keys/${id}`),
};

// Audit Logs
export interface AuditLog {
  id: string;
  organizationId: string;
  projectId?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}
export const auditLogs = {
  list: (params?: { organizationId?: string; projectId?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.organizationId) qs.set('organizationId', params.organizationId);
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    return request<{ auditLogs: AuditLog[]; total: number }>('GET', `/v1/audit-logs${qs.toString() ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<AuditLog>('GET', `/v1/audit-logs/${id}`),
};

// V2 Analytics
export const analytics = {
  usage: () => request<unknown>('GET', '/v2/analytics/usage'),
  compliance: () => request<unknown>('GET', '/v2/analytics/compliance'),
  complianceReport: (pack: string) => request<unknown>('GET', `/v2/compliance-pack/${pack}/report`),
};

// Engine APIs
export const engines = {
  router: {
    providers: () => request<{ providers: Array<{ provider: string; healthy: boolean; failureCount: number; usageInWindow: number }>; total: number }>('GET', '/engines/router/providers'),
    health: () => request<{ status: string; providers: unknown[]; healthy: number; total: number }>('GET', '/engines/router/health'),
    resetBreakers: () => request<{ message: string }>('POST', '/engines/router/reset-circuit-breakers'),
  },
  risk: {
    rules: () => request<{ rules: Array<{ id: string; dimension: string; enabled: boolean }>; total: number }>('GET', '/engines/risk/rules'),
    thresholds: () => request<{ thresholds: Record<string, number> }>('GET', '/engines/risk/thresholds'),
    assess: (data: Record<string, unknown>) => request<{ assessment: Record<string, unknown> }>('POST', '/engines/risk/assess', data),
  },
  governance: {
    policies: () => request<{ policies: Array<{ id: string; name: string; description: string; enabled: boolean; priority: number; conditionCount: number; actionCount: number }>; total: number }>('GET', '/engines/governance/policies'),
    createPolicy: (data: Record<string, unknown>) => request<{ id: string; message: string }>('POST', '/engines/governance/policies', data),
    removePolicy: (id: string) => request<{ message: string }>('DELETE', `/engines/governance/policies/${id}`),
    approvals: () => request<{ approvals: unknown[]; total: number }>('GET', '/engines/governance/approvals'),
    approve: (id: string, approverId: string) => request<{ approval: unknown }>('POST', `/engines/governance/approvals/${id}/approve`, { approverId }),
    deny: (id: string, approverId: string, reason: string) => request<{ approval: unknown }>('POST', `/engines/governance/approvals/${id}/deny`, { approverId, reason }),
    auditLog: () => request<{ entries: unknown[]; total: number }>('GET', '/engines/governance/audit-log'),
  },
  compliance: {
    packs: () => request<{ packs: Array<{ id: string; name: string; fullName: string; enabled: boolean; ruleCount: number }>; total: number }>('GET', '/engines/compliance/packs'),
    evaluate: (data: Record<string, unknown>) => request<{ reports?: unknown[]; report?: unknown; total?: number }>('POST', '/engines/compliance/evaluate', data),
  },
};
