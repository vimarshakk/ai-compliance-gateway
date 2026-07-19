import { describe, it, expect } from 'vitest';
import { generateBom } from '../src/lib/bom.js';
import { resolve } from 'node:path';

describe('BOM Generator', () => {
  const rootPath = resolve(import.meta.dirname, '../../..');

  it('should generate a BOM from the project', () => {
    const bom = generateBom(rootPath);
    expect(bom.entries.length).toBeGreaterThan(0);
    expect(bom.generatedAt).toBeDefined();
    expect(bom.rootPath).toBe(rootPath);
  });

  it('should categorize entries correctly', () => {
    const bom = generateBom(rootPath);
    expect(bom.categories).toBeDefined();
    expect(typeof bom.categories).toBe('object');

    // Should have at least one category
    const cats = Object.keys(bom.categories);
    expect(cats.length).toBeGreaterThan(0);
  });

  it('should detect databases (Redis, PostgreSQL)', () => {
    const bom = generateBom(rootPath);
    const dbEntries = bom.categories['database'] || [];
    const dbNames = dbEntries.map(e => e.name.toLowerCase());
    expect(dbNames.some(n => n.includes('redis') || n.includes('postgres'))).toBe(true);
  });

  it('should detect at least one policy or guardrail engine', () => {
    const bom = generateBom(rootPath);
    const policyEntries = bom.categories['policy'] || [];
    const guardEntries = bom.categories['guardrail'] || [];
    const allPolicyTools = [...policyEntries, ...guardEntries];
    expect(allPolicyTools.length).toBeGreaterThan(0);
  });

  it('should detect guardrails', () => {
    const bom = generateBom(rootPath);
    const guardEntries = bom.categories['guardrail'] || [];
    expect(guardEntries.some(e => e.name.includes('Presidio'))).toBe(true);
  });

  it('each entry should have required fields', () => {
    const bom = generateBom(rootPath);
    for (const entry of bom.entries) {
      expect(entry.category).toBeDefined();
      expect(entry.name).toBeDefined();
      expect(entry.confidence).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(entry.confidence);
    }
  });
});
