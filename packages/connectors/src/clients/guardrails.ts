import { BaseConnector } from './base.js';
import type { GuardrailsConnector } from '../interfaces/index.js';

const DEFAULT_GUARDRAILS_RESULT = {
  response: { role: 'assistant', content: '' },
  rails_output: { input: { triggered: false }, output: { triggered: false } },
};

export class NeMoGuardrailsConnector extends BaseConnector implements GuardrailsConnector {
  constructor(baseUrl: string) {
    super('nemo-guardrails', baseUrl, 60000);
  }

  async check(params: { messages: Array<{ role: string; content: string }> }) {
    return this.requestGraceful('POST', '/v2/chat', DEFAULT_GUARDRAILS_RESULT, { messages: params.messages });
  }
}
