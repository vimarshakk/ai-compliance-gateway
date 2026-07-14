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

  async *stream(params: {
    model: string;
    messages: Array<{ role: string; content: string | null }>;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<{ id: string; chunk: string; finishReason: string | null }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LiteLLM stream error (${response.status}): ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (choice) {
              yield {
                id: parsed.id ?? generateId(),
                chunk: choice.delta?.content ?? '',
                finishReason: choice.finish_reason ?? null,
              };
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getModels() {
    return this.request<{ data: Array<{ id: string; object: string }> }>('GET', '/models', undefined, { Authorization: `Bearer ${this.apiKey}` });
  }

  async getHealth() {
    return this.request<Record<string, { status: string }>>('GET', '/health', undefined, { Authorization: `Bearer ${this.apiKey}` });
  }
}
