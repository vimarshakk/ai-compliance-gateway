import { describe, it, expect } from 'vitest';
import { providers } from '../src/data/providers.js';
import { compliancePacks } from '../src/data/compliance-packs.js';

describe('Provider Certification Data', () => {
  it('should have 10 providers', () => {
    expect(providers.length).toBe(10);
  });

  it('each provider should have required fields', () => {
    for (const p of providers) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.company).toBeDefined();
      expect(p.baseUrl).toBeDefined();
      expect(p.apiStyle).toBeDefined();
      expect(p.complianceFeatures).toBeDefined();
      expect(p.models.length).toBeGreaterThan(0);
    }
  });

  it('should include OpenAI and Anthropic', () => {
    expect(providers.some(p => p.id === 'openai')).toBe(true);
    expect(providers.some(p => p.id === 'anthropic')).toBe(true);
  });

  it('Ollama should be local', () => {
    const ollama = providers.find(p => p.id === 'ollama');
    expect(ollama).toBeDefined();
    expect(ollama!.supportedRegions).toContain('local');
    expect(ollama!.baseUrl).toContain('localhost');
  });

  it('Azure OpenAI should support HIPAA', () => {
    const azure = providers.find(p => p.id === 'azure-openai');
    expect(azure).toBeDefined();
    expect(azure!.complianceFeatures.hipaa).toBe(true);
    expect(azure!.complianceFeatures.soc2).toBe(true);
  });
});

describe('Compliance Packs', () => {
  it('should have 8 packs', () => {
    expect(compliancePacks.length).toBe(8);
  });

  it('each pack should have required fields', () => {
    for (const p of compliancePacks) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.description).toBeDefined();
      expect(p.region).toBeDefined();
      expect(p.industry).toBeDefined();
      expect(p.version).toBeDefined();
      expect(p.rules).toBeGreaterThan(0);
      expect(p.requiredControls.length).toBeGreaterThan(0);
      expect(p.frameworks.length).toBeGreaterThan(0);
    }
  });

  it('should have DPDP for India', () => {
    const dpdp = compliancePacks.find(p => p.id === 'dpdp');
    expect(dpdp).toBeDefined();
    expect(dpdp!.region).toBe('in');
  });

  it('should have HIPAA for US healthcare', () => {
    const hipaa = compliancePacks.find(p => p.id === 'hipaa');
    expect(hipaa).toBeDefined();
    expect(hipaa!.region).toBe('us');
    expect(hipaa!.industry).toBe('Healthcare');
  });

  it('should have AI Safety pack', () => {
    const ai = compliancePacks.find(p => p.id === 'ai-safety');
    expect(ai).toBeDefined();
    expect(ai!.requiredControls).toContain('prompt-injection-detection');
  });
});
