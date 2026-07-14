import { BaseConnector } from './base.js';
import type { GuardrailsConnector } from '../interfaces/index.js';

// FAIL CLOSED: When NeMo is unreachable, block content (not allow all)
const DEFAULT_GUARDRAILS_RESULT = {
  response: { role: 'assistant', content: 'Content blocked: guardrails service (NeMo) is unavailable' },
  rails_output: { input: { triggered: true, reason: 'Guardrails service unavailable — blocking for safety' }, output: { triggered: true, reason: 'Guardrails service unavailable — blocking for safety' } },
};

export class NeMoGuardrailsConnector extends BaseConnector implements GuardrailsConnector {
  constructor(baseUrl: string) {
    super('nemo-guardrails', baseUrl, 60000);
  }

  async check(params: { messages: Array<{ role: string; content: string }> }) {
    return this.requestGraceful('POST', '/v2/chat', DEFAULT_GUARDRAILS_RESULT, { messages: params.messages });
  }
}
