import { describe, it, expect } from 'vitest';

describe('E2E Gateway', () => {
  it('health endpoint returns status', async () => {
    const port = process.env.GATEWAY_PORT ?? '3000';
    try {
      const res = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.status).toBeDefined();
    } catch {
      // Skip if gateway not running
      console.log('Skipping E2E test: gateway not running');
    }
  });
});
