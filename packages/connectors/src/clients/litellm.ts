import { BaseConnector } from './base.js';
import type { LLMConnector } from '../interfaces/index.js';
import { generateId } from '@acg/shared';

export class LiteLLMConnector extends BaseConnector implements LLMConnector {
  private apiKey: string;

  constructor(baseUrl: string, apiKey = '') {
    super('litellm', baseUrl);
    this.apiKey = apiKey;
  }

  async complete(params: {
    model: string;
    messages: Array<{ role: string; content: string | null }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }) {
    return this.request<{
      id: string;
      choices: Array<{ index: number; message: { role: string; content: string }; finish_reason: string | null }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model: string;
    }>('POST', '/chat/completions', {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: params.stream ?? false,
    }, { Authorization: `Bearer ${this.apiKey}` });
  }

  async getModels() {
    return this.request<{ data: Array<{ id: string; object: string }> }>('GET', '/models', undefined, { Authorization: `Bearer ${this.apiKey}` });
  }

  async getHealth() {
    return this.request<Record<string, { status: string }>>('GET', '/health', undefined, { Authorization: `Bearer ${this.apiKey}` });
  }
}
