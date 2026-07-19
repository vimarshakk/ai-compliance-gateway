import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ChatCompletionRequestSchema } from '@acg/contracts';

describe('Request Validation', () => {
  describe('ChatCompletionRequestSchema', () => {
    it('validates a valid request', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty messages', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing model', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'invalid', content: 'Hello' }],
      });
      expect(result.success).toBe(false);
    });

    it('applies defaults', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stream).toBe(false);
      }
    });

    it('validates temperature range', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 3,
      });
      expect(result.success).toBe(false);
    });

    it('validates max_tokens is positive integer', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: -1,
      });
      expect(result.success).toBe(false);
    });
  });
});
