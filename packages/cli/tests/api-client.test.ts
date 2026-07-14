import { describe, it, expect } from 'vitest';
import { AcgApiClient, createClient } from '../src/lib/api-client.js';

describe('API Client', () => {
  it('should create a client with defaults', () => {
    const client = createClient({});
    expect(client).toBeInstanceOf(AcgApiClient);
  });

  it('should create a client with custom URLs', () => {
    const client = createClient({
      adminUrl: 'http://custom:3002',
      gatewayUrl: 'http://custom:3000',
      apiKey: 'test-key',
    });
    expect(client).toBeInstanceOf(AcgApiClient);
  });

  it('should fail gracefully when admin URL is not set', async () => {
    const client = new AcgApiClient();
    try {
      await client.scanProject('.');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('Admin URL not configured');
    }
  });

  it('should fail gracefully when provider not found', async () => {
    const client = new AcgApiClient({ adminUrl: 'http://localhost:99999' });
    try {
      await client.getProvider('nonexistent');
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.message).toBeDefined();
    }
  });

  it('should return false for health check on unreachable server', async () => {
    const client = new AcgApiClient({ adminUrl: 'http://localhost:99999' });
    const healthy = await client.healthCheck('http://localhost:99999');
    expect(healthy).toBe(false);
  });
});
