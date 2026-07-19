import { describe, it, expect } from 'vitest';
import { generateId, sha256, maskPII, immutableHash } from '@acg/shared';

describe('packages/shared', () => {
  describe('generateId', () => {
    it('generates a unique id', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('sha256', () => {
    it('produces a consistent hash', () => {
      const hash1 = sha256('hello');
      const hash2 = sha256('hello');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = sha256('hello');
      const hash2 = sha256('world');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('maskPII', () => {
    it('masks email addresses', () => {
      const result = maskPII('Contact me at john@example.com');
      expect(result).toContain('***');
      expect(result).not.toContain('john@example.com');
    });

    it('masks phone numbers', () => {
      const result = maskPII('Call 555-123-4567');
      expect(result).toContain('***');
      expect(result).not.toContain('555-123-4567');
    });

    it('applies default mask for unknown types', () => {
      const result = maskPII('Hello world');
      expect(result).not.toBe('Hello world');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('immutableHash', () => {
    it('produces a deterministic hash', () => {
      const input = { a: 1, b: 'test' };
      const hash1 = immutableHash(input);
      const hash2 = immutableHash(input);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = immutableHash({ a: 1 });
      const hash2 = immutableHash({ a: 2 });
      expect(hash1).not.toBe(hash2);
    });
  });
});
