import { describe, it, expect } from 'vitest';
import {
  ChatCompletionRequestSchema,
  CreateOrganizationSchema,
} from '@acg/contracts';

describe('Validation Schemas', () => {
  describe('ChatCompletionRequest', () => {
    it('validates a valid request', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects request without messages', () => {
      const result = ChatCompletionRequestSchema.safeParse({
        model: 'gpt-4',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateOrganization', () => {
    it('validates a valid organization', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test Org',
        slug: 'test-org',
      });
      expect(result.success).toBe(true);
    });

    it('rejects organization without name', () => {
      const result = CreateOrganizationSchema.safeParse({
        slug: 'test-org',
      });
      expect(result.success).toBe(false);
    });
  });
});
