import { describe, it, expect } from 'vitest';
import { ComplianceEngine, createDefaultComplianceEngine } from '../src/index.js';
import type { ComplianceContext } from '../src/index.js';

function makeContext(overrides: Partial<ComplianceContext> = {}): ComplianceContext {
  return {
    requestId: 'req_test_1',
    organizationId: 'org_1',
    userId: 'user_1',
    model: 'gpt-4',
    provider: 'openai',
    messages: [{ role: 'user', content: 'Hello' }],
    piiDetected: [],
    dataFlow: 'internal',
    encryptionInTransit: true,
    encryptionAtRest: true,
    timestamp: new Date(),
    ...overrides,
  };
}

describe('ComplianceEngine', () => {
  const engine = createDefaultComplianceEngine();

  it('has all 5 builtin packs', () => {
    const packs = engine.getPacks();
    expect(packs.length).toBe(5);
    const ids = packs.map((p) => p.id);
    expect(ids).toContain('hipaa');
    expect(ids).toContain('dpdp');
    expect(ids).toContain('pci');
    expect(ids).toContain('gdpr');
    expect(ids).toContain('sox');
  });

  it('evaluates HIPAA pack for compliant request', () => {
    const report = engine.evaluate('hipaa', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      dataFlow: 'internal',
      piiDetected: [],
    }));
    expect(report.packId).toBe('hipaa');
    expect(report.packName).toBe('HIPAA');
    expect(report.overallStatus).toBeDefined();
    expect(typeof report.score).toBe('number');
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.passed + report.failed + report.warnings).toBe(report.checks.length);
  });

  it('fails HIPAA when PHI sent externally', () => {
    const report = engine.evaluate('hipaa', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      dataFlow: 'external',
      piiDetected: [{ type: 'MEDICAL_RECORD', value: 'MRN-123' }],
    }));
    expect(report.failed).toBeGreaterThan(0);
    expect(report.overallStatus).not.toBe('compliant');
  });

  it('evaluates DPDP pack', () => {
    const report = engine.evaluate('dpdp', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      dataFlow: 'internal',
      piiDetected: [],
    }));
    expect(report.packId).toBe('dpdp');
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it('evaluates PCI-DSS pack', () => {
    const report = engine.evaluate('pci', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      piiDetected: [],
    }));
    expect(report.packId).toBe('pci');
  });

  it('evaluates GDPR pack', () => {
    const report = engine.evaluate('gdpr', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      piiDetected: [],
    }));
    expect(report.packId).toBe('gdpr');
  });

  it('evaluates SOX pack', () => {
    const report = engine.evaluate('sox', makeContext({
      encryptionInTransit: true,
      encryptionAtRest: true,
      piiDetected: [],
    }));
    expect(report.packId).toBe('sox');
  });

  it('evaluateAll returns all enabled packs', () => {
    const reports = engine.evaluateAll(makeContext());
    const allPacks = engine.getPacks();
    const enabledCount = allPacks.filter((p) => p.enabled).length;
    expect(reports.length).toBe(enabledCount);
    expect(reports.length).toBeGreaterThanOrEqual(2);
  });

  it('reports fail when encryption missing', () => {
    const report = engine.evaluate('hipaa', makeContext({
      encryptionInTransit: false,
      encryptionAtRest: false,
      dataFlow: 'internal',
      piiDetected: [],
    }));
    expect(report.failed).toBeGreaterThan(0);
  });

  it('throws for unknown pack', () => {
    expect(() => engine.evaluate('nonexistent', makeContext())).toThrow();
  });

  it('each pack has required metadata', () => {
    const packs = engine.getPacks();
    for (const pack of packs) {
      expect(typeof pack.name).toBe('string');
      expect(typeof pack.fullName).toBe('string');
      expect(typeof pack.version).toBe('string');
      expect(typeof pack.description).toBe('string');
      expect(pack.rules.length).toBeGreaterThan(0);
      expect(pack.dataClassifications.length).toBeGreaterThan(0);
      expect(pack.encryptionRequirements.length).toBeGreaterThan(0);
      expect(pack.auditRequirements.length).toBeGreaterThan(0);
      expect(pack.breachNotification).toBeDefined();
      expect(pack.retentionPolicy).toBeDefined();
    }
  });

  it('reports include organizationId', () => {
    const report = engine.evaluate('hipaa', makeContext());
    expect(report.organizationId).toBe('org_1');
  });

  it('reports include generatedAt timestamp', () => {
    const report = engine.evaluate('hipaa', makeContext());
    expect(report.generatedAt).toBeInstanceOf(Date);
  });
});
