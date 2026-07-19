import { BaseConnector } from './base.js';
import type { PolicyEngineConnector } from '../interfaces/index.js';

// FAIL CLOSED: When OPA is unreachable, deny all requests (not allow all)
const DEFAULT_POLICY_RESULT = { allow: false, deny_reasons: ['Policy engine (OPA) is unavailable — denying for safety'] as string[] };

export class OPAConnector extends BaseConnector implements PolicyEngineConnector {
  constructor(baseUrl: string) {
    super('opa', baseUrl);
  }

  async evaluate(params: { input: Record<string, unknown> }) {
    const result = await this.requestGraceful<{ result: unknown }>('POST', '/v1/data/acg', { result: DEFAULT_POLICY_RESULT }, { input: params.input });
    return result;
  }

  async putPolicy(params: { path: string; policy: string }) {
    try {
      await this.request<unknown>('PUT', `/v1/policies/${params.path}`, params.policy, { 'Content-Type': 'text/plain' });
    } catch {
      console.warn(`[opa] Failed to put policy ${params.path}, continuing with existing policies`);
    }
  }

  async getPolicies() {
    return this.requestGraceful<{ result: Record<string, unknown> }>('GET', '/v1/policies', { result: {} });
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
