import type { ChatMessage } from '@acg/shared';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';

export interface CompletionRequest {
  model: string;
  provider: string;
  messages: ChatMessage[];
  organizationId?: string;
  userId?: string;
  projectId?: string;
  temperature?: number;
  maxTokens?: number;
  compliancePack?: string;
  firewallEnabled?: boolean;
  piiDetectionEnabled?: boolean;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model?: string;
  x_request_id?: string;
  x_organization_id?: string;
  pipeline?: any;
  compliance?: any;
}

export interface PipelineEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'response' | 'error';
  step?: string;
  data?: any;
}

export async function chatCompletion(req: CompletionRequest): Promise<CompletionResponse> {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `Gateway error: ${res.status}`);
  }

  return res.json();
}

export async function* streamCompletion(req: CompletionRequest): AsyncGenerator<PipelineEvent> {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `Gateway error: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const event = JSON.parse(data);
          yield event;
        } catch {}
      }
    }
  }
}

export async function listModels(): Promise<Array<{ id: string; provider: string; name: string }>> {
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/models`);
    if (!res.ok) return getDefaultModels();
    const data = await res.json();
    return data.data ?? getDefaultModels();
  } catch {
    return getDefaultModels();
  }
}

export async function healthCheck(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/health`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.services ?? {};
  } catch {
    return {};
  }
}

export async function evaluateContent(text: string, contentTypes?: string[]) {
  const res = await fetch(`${GATEWAY_URL}/v1/moderations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, contentTypes }),
  });

  if (!res.ok) throw new Error(`Moderation failed: ${res.status}`);
  return res.json();
}

function getDefaultModels() {
  return [
    { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini' },
    { id: 'claude-3.5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku' },
    { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash' },
  ];
}
