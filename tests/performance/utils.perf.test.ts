import { describe, it, expect } from 'vitest';
import { generateId, sha256 } from '@acg/shared';

describe('Performance', () => {
  it('shared utils performance', () => {
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      generateId();
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
    console.log(`generateId x10000: ${elapsed}ms`);
  });

  it('sha256 performance', () => {
    const start = Date.now();
    for (let i = 0; i < 10000; i++) {
      sha256(`test-message-${i}`);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);
    console.log(`sha256 x10000: ${elapsed}ms`);
  });
});
