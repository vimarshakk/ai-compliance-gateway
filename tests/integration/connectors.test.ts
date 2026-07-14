import { describe, it, expect } from 'vitest';
import { LiteLLMConnector } from '@acg/connectors';

describe('LiteLLM Connector', () => {
  it('initializes with correct config', () => {
    const connector = new LiteLLMConnector('http://localhost:4000');
    expect(connector).toBeDefined();
  });

  it('has required methods', () => {
    const connector = new LiteLLMConnector('http://localhost:4000');
    expect(typeof connector.complete).toBe('function');
    expect(typeof connector.getModels).toBe('function');
    expect(typeof connector.healthCheck).toBe('function');
  });
});
