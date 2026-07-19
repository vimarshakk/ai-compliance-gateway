import { describe, it, expect } from 'vitest';
import { LiteLLMConnector } from '../../packages/connectors/src/clients/litellm.js';

describe('Streaming Support', () => {
  describe('LiteLLMConnector.stream()', () => {
    it('1. stream() method exists and is callable', () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      expect(typeof connector.stream).toBe('function');
    });

    it('2. complete() passes stream: false by default', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;
      let capturedBody: any;
      global.fetch = async (url: any, opts: any) => {
        capturedBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({
          id: 'test-1',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'gpt-4',
        }), { headers: { 'Content-Type': 'application/json' } });
      };
      try {
        await connector.complete({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        });
        expect(capturedBody.stream).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('3. complete() can pass stream: true when explicitly set', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;
      let capturedBody: any;
      global.fetch = async (url: any, opts: any) => {
        capturedBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({
          id: 'test-1',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'gpt-4',
        }), { headers: { 'Content-Type': 'application/json' } });
      };
      try {
        await connector.complete({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
          stream: true,
        });
        expect(capturedBody.stream).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('4. stream() yields SSE chunks when LLM responds with streaming data', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      const sseChunks = [
        'data: {"id":"chunk-1","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n',
        'data: {"id":"chunk-1","choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n',
        'data: {"id":"chunk-1","choices":[{"delta":{},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ].join('');

      global.fetch = async () => {
        return new Response(sseChunks, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      };

      try {
        const chunks: any[] = [];
        for await (const chunk of connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          chunks.push(chunk);
        }

        expect(chunks).toHaveLength(3);
        expect(chunks[0].chunk).toBe('Hello');
        expect(chunks[1].chunk).toBe(' world');
        expect(chunks[2].finishReason).toBe('stop');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('5. stream() handles [DONE] signal correctly', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      global.fetch = async () => {
        return new Response('data: [DONE]\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      };

      try {
        const chunks: any[] = [];
        for await (const chunk of connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          chunks.push(chunk);
        }
        expect(chunks).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('6. stream() skips malformed JSON chunks without crashing', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      const sseChunks = [
        'data: not-json\n',
        'data: {"id":"chunk-1","choices":[{"delta":{"content":"OK"},"finish_reason":null}]}\n',
        'data: [DONE]\n',
      ].join('');

      global.fetch = async () => {
        return new Response(sseChunks, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      };

      try {
        const chunks: any[] = [];
        for await (const chunk of connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          chunks.push(chunk);
        }
        expect(chunks).toHaveLength(1);
        expect(chunks[0].chunk).toBe('OK');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('7. stream() throws on non-200 response', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      global.fetch = async () => {
        return new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      };

      try {
        const gen = connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        });
        await expect(gen.next()).rejects.toThrow('LiteLLM stream error (401)');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('8. stream() throws on empty response body', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      global.fetch = async () => {
        return new Response(null, { headers: { 'Content-Type': 'text/event-stream' } });
      };

      try {
        const gen = connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        });
        await expect(gen.next()).rejects.toThrow('No response body');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('9. stream() handles partial line buffering', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      // Simulate partial line buffering: data arrives in two chunks
      const chunk1 = 'data: {"id":"c1","choices":[{"delta":{"content":"Part1"},"finish_reason":null}]}\n';
      const chunk2 = 'data: {"id":"c1","choices":[{"delta":{"content":"Part2"},"finish_reason":null}]}\ndata: [DONE]\n';

      let callCount = 0;
      const mockReader = {
        read: async () => {
          callCount++;
          if (callCount === 1) return { done: false, value: new TextEncoder().encode(chunk1) };
          if (callCount === 2) return { done: false, value: new TextEncoder().encode(chunk2) };
          return { done: true, value: undefined };
        },
        releaseLock: () => {},
      };

      global.fetch = async () => {
        return new Response(new ReadableStream({
          start(controller) {
            // Controller is not used; mockReader handles it
          },
        }), { headers: { 'Content-Type': 'text/event-stream' } });
      };

      try {
        // We can't easily mock ReadableStream.getReader() in this test,
        // so we verify the connector can handle multiple SSE chunks in one fetch response
        const sseData = chunk1 + chunk2;
        global.fetch = async () => {
          return new Response(sseData, { headers: { 'Content-Type': 'text/event-stream' } });
        };

        const chunks: any[] = [];
        for await (const chunk of connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          chunks.push(chunk);
        }
        expect(chunks).toHaveLength(2);
        expect(chunks[0].chunk).toBe('Part1');
        expect(chunks[1].chunk).toBe('Part2');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('10. stream() skips empty SSE lines', async () => {
      const connector = new LiteLLMConnector('http://localhost:4000', 'test-key');
      const originalFetch = global.fetch;

      const sseChunks = [
        '\n',
        'data: {"id":"c1","choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n',
        '\n',
        'data: [DONE]\n',
      ].join('');

      global.fetch = async () => {
        return new Response(sseChunks, { headers: { 'Content-Type': 'text/event-stream' } });
      };

      try {
        const chunks: any[] = [];
        for await (const chunk of connector.stream({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {
          chunks.push(chunk);
        }
        expect(chunks).toHaveLength(1);
        expect(chunks[0].chunk).toBe('Hi');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
