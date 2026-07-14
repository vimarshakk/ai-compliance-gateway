import { describe, it, expect, beforeEach } from 'vitest';
import { PackRegistry, type PackManifest } from '../src/index.js';

describe('PackRegistry', () => {
  let registry: PackRegistry;

  beforeEach(() => {
    registry = new PackRegistry();
  });

  it('should list 8 built-in packs', () => {
    expect(registry.list()).toHaveLength(8);
  });

  it('should get a pack by name', () => {
    const dpdp = registry.get('dpdp');
    expect(dpdp).toBeDefined();
    expect(dpdp!.manifest.name).toBe('dpdp');
    expect(dpdp!.manifest.version).toBe('0.1.0');
    expect(dpdp!.verified).toBe(true);
  });

  it('should return undefined for unknown pack', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('should search packs by name', () => {
    const results = registry.search('hipaa');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].manifest.name).toBe('hipaa');
  });

  it('should search packs by tag', () => {
    const results = registry.search('healthcare');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should search packs by description', () => {
    const results = registry.search('payment');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should install a pack', () => {
    const result = registry.install('dpdp');
    expect(result.success).toBe(true);
    expect(result.packId).toBe('dpdp');
    expect(result.version).toBe('0.1.0');
    expect(registry.isInstalled('dpdp')).toBe(true);
  });

  it('should fail to install unknown pack', () => {
    const result = registry.install('nonexistent');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should uninstall a pack', () => {
    registry.install('dpdp');
    expect(registry.isInstalled('dpdp')).toBe(true);

    registry.uninstall('dpdp');
    expect(registry.isInstalled('dpdp')).toBe(false);
  });

  it('should list installed packs', () => {
    registry.install('dpdp');
    registry.install('hipaa');
    const installed = registry.listInstalled();
    expect(installed).toHaveLength(2);
    expect(installed.map((p) => p.manifest.name)).toContain('dpdp');
    expect(installed.map((p) => p.manifest.name)).toContain('hipaa');
  });

  it('should toggle pack enabled state', () => {
    registry.install('dpdp');
    expect(registry.toggle('dpdp', false)).toBe(true);
    const installed = registry.listInstalled().find((p) => p.manifest.name === 'dpdp');
    expect(installed!.enabled).toBe(false);

    expect(registry.toggle('dpdp', true)).toBe(true);
    expect(installed!.enabled).toBe(true);
  });

  it('should toggle return false for unknown pack', () => {
    expect(registry.toggle('nonexistent', true)).toBe(false);
  });

  it('should install with config', () => {
    const config = { maxRetryCount: 3, logLevel: 'verbose' };
    const result = registry.install('dpdp', config);
    expect(result.success).toBe(true);
    const installed = registry.listInstalled().find((p) => p.manifest.name === 'dpdp');
    expect(installed!.config).toEqual(config);
  });

  it('should publish a new pack', () => {
    const manifest: PackManifest = {
      name: 'custom-pack',
      version: '1.0.0',
      description: 'Custom compliance pack',
      author: 'Test Author',
      license: 'MIT',
      tags: ['custom'],
      compliance: [{ framework: 'CUSTOM', section: '1.0', description: 'Custom rules' }],
      rules: [{ id: 'r1', name: 'Rule 1', description: 'Test rule', severity: 'high', type: 'rego', content: 'deny { true }' }],
    };

    const result = registry.publish(manifest);
    expect(result.success).toBe(true);
    expect(result.packId).toBe('custom-pack');
    expect(registry.get('custom-pack')).toBeDefined();
  });

  it('should publish update to existing pack', () => {
    const manifest: PackManifest = {
      name: 'dpdp',
      version: '0.2.0',
      description: 'Updated DPDP',
      author: 'ACG Team',
      license: 'MIT',
      tags: ['dpdp'],
      compliance: [],
      rules: [],
    };

    const result = registry.publish(manifest);
    expect(result.success).toBe(true);
    expect(result.version).toBe('0.2.0');
    const entry = registry.get('dpdp');
    expect(entry!.versions.length).toBe(2);
  });

  it('should reject duplicate version publish', () => {
    const manifest: PackManifest = {
      name: 'dpdp',
      version: '0.1.0',
      description: 'Duplicate',
      author: 'ACG Team',
      license: 'MIT',
      tags: [],
      compliance: [],
      rules: [],
    };

    const result = registry.publish(manifest);
    expect(result.success).toBe(false);
    expect(result.message).toContain('already published');
  });

  it('should increment downloads on install', () => {
    const before = registry.get('dpdp')!.downloads;
    registry.install('dpdp');
    const after = registry.get('dpdp')!.downloads;
    expect(after).toBe(before + 1);
  });

  it('should return compliance frameworks from installed packs', () => {
    registry.install('dpdp');
    registry.install('hipaa');
    registry.install('gdpr');
    const frameworks = registry.getComplianceFrameworks();
    expect(frameworks).toContain('DPDP');
    expect(frameworks).toContain('HIPAA');
    expect(frameworks).toContain('GDPR');
  });

  it('should return empty frameworks when nothing installed', () => {
    expect(registry.getComplianceFrameworks()).toHaveLength(0);
  });

  it('all built-in packs should have required fields', () => {
    for (const entry of registry.list()) {
      expect(entry.manifest.name).toBeTruthy();
      expect(entry.manifest.version).toBeTruthy();
      expect(entry.manifest.author).toBeTruthy();
      expect(entry.manifest.license).toBeTruthy();
      expect(entry.manifest.tags.length).toBeGreaterThan(0);
      expect(entry.versions.length).toBeGreaterThan(0);
    }
  });
});
