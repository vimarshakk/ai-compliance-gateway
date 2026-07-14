import { describe, it, expect } from 'vitest';
import { scanProject } from '../src/lib/scanner.js';
import { resolve } from 'node:path';

describe('Scanner', () => {
  const rootPath = resolve(import.meta.dirname, '../../..');

  it('should scan the project and find findings', () => {
    const result = scanProject(rootPath);
    expect(result.filesScanned).toBeGreaterThan(0);
    expect(result.findings).toBeDefined();
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.summary).toBeDefined();
  });

  it('should detect model references in codebase', () => {
    const result = scanProject(rootPath);
    const modelFindings = result.findings.filter(f => f.type === 'model-ref');
    // The scanner finds model references in code comments, config, docs
    expect(result.summary.modelRefs.length).toBeGreaterThan(0);
  });

  it('should have a risk score between 0 and 100', () => {
    const result = scanProject(rootPath);
    expect(result.summary.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.riskScore).toBeLessThanOrEqual(100);
  });

  it('should detect model references', () => {
    const result = scanProject(rootPath);
    expect(result.summary.modelRefs.length).toBeGreaterThan(0);
  });

  it('should produce a valid ScanResult type', () => {
    const result = scanProject(rootPath);
    expect(typeof result.rootPath).toBe('string');
    expect(typeof result.filesScanned).toBe('number');
    expect(typeof result.summary.sdks).toBe('object');
    expect(Array.isArray(result.summary.sdks)).toBe(true);
    expect(typeof result.summary.promptsFound).toBe('number');
    expect(typeof result.summary.secretsFound).toBe('number');
  });
});
