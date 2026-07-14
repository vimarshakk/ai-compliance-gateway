import type { ChatMessage } from '@acg/shared';

export interface ACGConfig {
  gatewayUrl: string;
  adminUrl: string;
  apiKey: string;
  organizationId?: string;
  projectId?: string;
  timeout?: number;
  retries?: number;
  enhanced?: boolean;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  compliancePack?: string;
  compliancePacks?: string[];
  userRole?: string;
  firewallEnabled?: boolean;
  piiDetectionEnabled?: boolean;
  provider?: string;
}

export interface ChatCompletionResponse {
  id: string;
  requestId: string;
  x_request_id: string;
  x_organization_id: string;
  model: string;
  provider: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finishReason: string;
  }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: { inputCost: number; outputCost: number; totalCost: number; currency: string };
  policyDecisions: unknown[];
  piiResult?: unknown;
  firewallResult?: unknown;
  latencyMs: number;
}

export interface ModerationRequest {
  text?: string;
  messages?: Array<{ role: string; content: string }>;
  contentTypes?: string[];
}

export interface ModerationResponse {
  id: string;
  moderationResult: string;
  reasons: string[];
  riskLevel: string;
  latencyMs: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, { status: string; latencyMs?: number }>;
  summary: { healthy: number; total: number };
}

export interface RouterProvider {
  provider: string;
  healthy: boolean;
  failureCount: number;
  usageInWindow: number;
}

export interface RiskRule {
  id: string;
  dimension: string;
  name: string;
  enabled: boolean;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditionCount: number;
  actionCount: number;
}

export interface CompliancePack {
  id: string;
  name: string;
  fullName: string;
  enabled: boolean;
  ruleCount: number;
}

export class ACGError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public type: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ACGError';
  }
}

export class ACGClient {
  private config: Required<ACGConfig>;

  constructor(config: ACGConfig) {
    this.config = {
      gatewayUrl: config.gatewayUrl.replace(/\/$/, ''),
      adminUrl: config.adminUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
      organizationId: config.organizationId ?? 'default',
      projectId: config.projectId ?? 'default',
      timeout: config.timeout ?? 60000,
      retries: config.retries ?? 3,
      enhanced: config.enhanced ?? false,
    };
  }

  // ─── Chat ────────────────────────────────────────────

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = {};
    if (this.config.enhanced) headers['X-Pipeline'] = 'enhanced';

    const res = await this.requestWithRetry<ChatCompletionResponse>(
      'POST',
      `${this.config.gatewayUrl}/chat/completions`,
      {
        ...request,
        model: request.model ?? 'gpt-4',
        organizationId: this.config.organizationId,
        projectId: this.config.projectId,
      },
      headers,
    );
    return res;
  }

  async moderate(request: ModerationRequest): Promise<ModerationResponse> {
    return this.requestWithRetry<ModerationResponse>('POST', `${this.config.gatewayUrl}/moderations`, {
      ...request,
      organizationId: this.config.organizationId,
    });
  }

  // ─── Health ──────────────────────────────────────────

  async health(): Promise<HealthStatus> {
    const res = await fetch(`${this.config.gatewayUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.json() as Promise<HealthStatus>;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const status = await this.health();
      return status.status === 'healthy';
    } catch {
      return false;
    }
  }

  async readiness(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.gatewayUrl}/health/ready`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Engine: Router ──────────────────────────────────

  async routerProviders(): Promise<{ providers: RouterProvider[]; total: number }> {
    return this.adminRequest('GET', '/engines/router/providers');
  }

  async routerHealth(): Promise<{ status: string; providers: unknown[]; healthy: number; total: number }> {
    return this.adminRequest('GET', '/engines/router/health');
  }

  async resetCircuitBreakers(): Promise<{ message: string }> {
    return this.adminRequest('POST', '/engines/router/reset-circuit-breakers');
  }

  // ─── Engine: Risk ────────────────────────────────────

  async riskRules(): Promise<{ rules: RiskRule[]; total: number }> {
    return this.adminRequest('GET', '/engines/risk/rules');
  }

  async riskThresholds(): Promise<{ thresholds: Record<string, number> }> {
    return this.adminRequest('GET', '/engines/risk/thresholds');
  }

  async assessRisk(data: Record<string, unknown>): Promise<{ assessment: Record<string, unknown> }> {
    return this.adminRequest('POST', '/engines/risk/assess', data);
  }

  // ─── Engine: Governance ──────────────────────────────

  async governancePolicies(): Promise<{ policies: GovernancePolicy[]; total: number }> {
    return this.adminRequest('GET', '/engines/governance/policies');
  }

  async createGovernancePolicy(data: Record<string, unknown>): Promise<{ id: string; message: string }> {
    return this.adminRequest('POST', '/engines/governance/policies', data);
  }

  async removeGovernancePolicy(id: string): Promise<{ message: string }> {
    return this.adminRequest('DELETE', `/engines/governance/policies/${id}`);
  }

  async governanceApprovals(): Promise<{ approvals: unknown[]; total: number }> {
    return this.adminRequest('GET', '/engines/governance/approvals');
  }

  async approveRequest(id: string, approverId: string): Promise<{ approval: unknown }> {
    return this.adminRequest('POST', `/engines/governance/approvals/${id}/approve`, { approverId });
  }

  async denyRequest(id: string, approverId: string, reason: string): Promise<{ approval: unknown }> {
    return this.adminRequest('POST', `/engines/governance/approvals/${id}/deny`, { approverId, reason });
  }

  async governanceAuditLog(): Promise<{ entries: unknown[]; total: number }> {
    return this.adminRequest('GET', '/engines/governance/audit-log');
  }

  // ─── Engine: Compliance ──────────────────────────────

  async compliancePacks(): Promise<{ packs: CompliancePack[]; total: number }> {
    return this.adminRequest('GET', '/engines/compliance/packs');
  }

  async evaluateCompliance(data: Record<string, unknown>): Promise<{ reports?: unknown[]; report?: unknown; total?: number }> {
    return this.adminRequest('POST', '/engines/compliance/evaluate', data);
  }

  // ─── Organizations ───────────────────────────────────

  async listOrganizations(): Promise<{ organizations: unknown[]; total: number }> {
    return this.adminRequest('GET', '/v1/organizations');
  }

  async createOrganization(data: { name: string; slug: string; compliancePack?: string }): Promise<unknown> {
    return this.adminRequest('POST', '/v1/organizations', data);
  }

  // ─── Policies ────────────────────────────────────────

  async listPolicies(organizationId?: string): Promise<{ policies: unknown[]; total: number }> {
    const query = organizationId ? `?organizationId=${organizationId}` : '';
    return this.adminRequest('GET', `/v1/policies${query}`);
  }

  async createPolicy(data: { organizationId: string; name: string; type: string; rules: unknown[] }): Promise<unknown> {
    return this.adminRequest('POST', '/v1/policies', data);
  }

  // ─── Internal ────────────────────────────────────────

  private async requestWithRetry<T>(method: string, url: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    let lastError: ACGError | undefined;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey,
          ...extraHeaders,
        };

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('retry-after') ?? '5', 10);
          if (attempt < this.config.retries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
          const err = await res.json().catch(() => ({ error: { message: 'Rate limited' } }));
          throw new ACGError(err.error?.message ?? 'Rate limited', 429, 'RATE_LIMITED', 'rate_limit_error', retryAfter);
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw new ACGError(
            err.error?.message ?? 'Request failed',
            res.status,
            err.error?.code ?? 'UNKNOWN',
            err.error?.type ?? 'api_error',
          );
        }

        return res.json() as Promise<T>;
      } catch (error) {
        if (error instanceof ACGError) {
          lastError = error;
          if (error.statusCode !== 429 || attempt >= this.config.retries) throw error;
        } else {
          throw error;
        }
      }
    }

    throw lastError ?? new ACGError('Max retries exceeded', 500, 'MAX_RETRIES', 'server_error');
  }

  private async adminRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const res = await fetch(`${this.config.adminUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new ACGError(
        typeof err === 'string' ? err : err.error ?? 'Admin request failed',
        res.status,
        'ADMIN_ERROR',
        'api_error',
      );
    }

    return res.json() as Promise<T>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
