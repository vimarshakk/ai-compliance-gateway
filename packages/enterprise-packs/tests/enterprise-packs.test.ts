import { describe, it, expect } from 'vitest';
import { ALL_PACKS, getPack, getPacksByFramework, getTotalRules, HIPAA_PACK, PCI_DSS_PACK, SOC2_PACK, ABDM_PACK, AI_SAFETY_PACK, BANKING_PACK } from '../src/index.js';

describe('Enterprise Packs', () => {
  it('should have 6 enterprise packs', () => {
    expect(ALL_PACKS).toHaveLength(6);
  });

  it('should get pack by id', () => {
    expect(getPack('hipaa')).toBeDefined();
    expect(getPack('hipaa')!.name).toBe('HIPAA Compliance');
  });

  it('should return undefined for unknown pack', () => {
    expect(getPack('nonexistent')).toBeUndefined();
  });

  it('should get packs by framework', () => {
    const healthcare = getPacksByFramework('HIPAA');
    expect(healthcare).toHaveLength(1);
    expect(healthcare[0].id).toBe('hipaa');
  });

  it('should count total rules across all packs', () => {
    const total = getTotalRules();
    expect(total).toBeGreaterThan(30);
  });

  it('HIPAA pack should have 8 rules', () => {
    expect(HIPAA_PACK.rules).toHaveLength(8);
    expect(HIPAA_PACK.rules[0].id).toBe('hipaa-001');
  });

  it('PCI-DSS pack should have 6 rules', () => {
    expect(PCI_DSS_PACK.rules).toHaveLength(6);
  });

  it('SOC2 pack should have 6 rules', () => {
    expect(SOC2_PACK.rules).toHaveLength(6);
  });

  it('ABDM pack should have 7 rules', () => {
    expect(ABDM_PACK.rules).toHaveLength(7);
  });

  it('AI Safety pack should have 8 rules', () => {
    expect(AI_SAFETY_PACK.rules).toHaveLength(8);
  });

  it('Banking pack should have 6 rules', () => {
    expect(BANKING_PACK.rules).toHaveLength(6);
  });

  it('all packs should have required metadata', () => {
    for (const pack of ALL_PACKS) {
      expect(pack.id).toBeTruthy();
      expect(pack.name).toBeTruthy();
      expect(pack.description).toBeTruthy();
      expect(pack.framework).toBeTruthy();
      expect(pack.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pack.author).toBeTruthy();
      expect(pack.tags.length).toBeGreaterThan(0);
    }
  });

  it('all rules should have required fields', () => {
    for (const pack of ALL_PACKS) {
      for (const rule of pack.rules) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
        expect(rule.description).toBeTruthy();
        expect(rule.severity).toMatch(/^(critical|high|medium|low|info)$/);
        expect(rule.type).toMatch(/^(rego|javascript|python|yaml)$/);
        expect(rule.content).toBeTruthy();
        expect(rule.section).toBeTruthy();
        expect(rule.framework).toBe(pack.framework);
      }
    }
  });

  it('HIPAA rules should reference specific sections', () => {
    const sections = HIPAA_PACK.rules.map((r) => r.section);
    expect(sections).toContain('§164.530(c)');
    expect(sections).toContain('§164.312(b)');
    expect(sections).toContain('§164.502(b)');
    expect(sections).toContain('§164.312(a)(2)(iv)');
    expect(sections).toContain('§164.312(a)(1)');
    expect(sections).toContain('§164.514(b)');
  });

  it('all critical rules should be rego type', () => {
    for (const pack of ALL_PACKS) {
      const criticalRules = pack.rules.filter((r) => r.severity === 'critical');
      for (const rule of criticalRules) {
        expect(rule.type).toBe('rego');
      }
    }
  });

  it('each pack should have at least 2 high-or-critical rules', () => {
    for (const pack of ALL_PACKS) {
      const highCount = pack.rules.filter((r) => r.severity === 'critical' || r.severity === 'high').length;
      expect(highCount).toBeGreaterThanOrEqual(2);
    }
  });
});
