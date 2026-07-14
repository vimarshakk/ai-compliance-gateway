import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, type PluginManifest, type PluginType } from '../src/index.js';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it('should list 6 community plugins', () => {
    expect(registry.listAvailable()).toHaveLength(6);
  });

  it('should search plugins by name', () => {
    const results = registry.search('slack');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain('slack');
  });

  it('should search plugins by keyword', () => {
    const results = registry.search('github');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should search plugins by description', () => {
    const results = registry.search('pharmaceutical');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should validate a valid manifest', () => {
    const manifest: PluginManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    const result = registry.validate(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('should fail validation for missing name', () => {
    const manifest: PluginManifest = {
      name: '',
      version: '1.0.0',
      description: 'Test',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    const result = registry.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: name');
  });

  it('should fail validation for bad version format', () => {
    const manifest: PluginManifest = {
      name: 'test',
      version: '1.0',
      description: 'Test',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    const result = registry.validate(manifest);
    expect(result.errors).toContain('Version must follow semver format (X.Y.Z)');
  });

  it('should warn about dangerous permissions', () => {
    const manifest: PluginManifest = {
      name: 'test',
      version: '1.0.0',
      description: 'Test',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [
        { type: 'exec', description: 'Execute commands', required: true },
        { type: 'filesystem', description: 'Read files', required: true },
      ],
      entry: 'dist/index.js',
    };

    const result = registry.validate(manifest);
    expect(result.warnings.some((w) => w.includes('dangerous'))).toBe(true);
  });

  it('should install a valid plugin', () => {
    const manifest: PluginManifest = {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My plugin',
      author: 'me',
      license: 'MIT',
      type: 'notifier',
      minAcgVersion: '0.1.0',
      permissions: [{ type: 'network', description: 'Send notifications', required: true }],
      entry: 'dist/index.js',
    };

    const installed = registry.install(manifest);
    expect(installed.manifest.name).toBe('my-plugin');
    expect(installed.enabled).toBe(true);
    expect(installed.runCount).toBe(0);
    expect(registry.isInstalled('my-plugin')).toBe(true);
  });

  it('should fail to install invalid plugin', () => {
    const manifest: PluginManifest = {
      name: '',
      version: '1.0.0',
      description: 'Bad',
      author: 'x',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: '',
    };

    expect(() => registry.install(manifest)).toThrow();
  });

  it('should uninstall a plugin', () => {
    const manifest: PluginManifest = {
      name: 'to-remove',
      version: '1.0.0',
      description: 'Remove me',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    registry.install(manifest);
    expect(registry.uninstall('to-remove')).toBe(true);
    expect(registry.isInstalled('to-remove')).toBe(false);
  });

  it('should toggle plugin enabled state', () => {
    const manifest: PluginManifest = {
      name: 'toggle-me',
      version: '1.0.0',
      description: 'Toggle me',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    registry.install(manifest);
    expect(registry.toggle('toggle-me', false)).toBe(true);
    expect(registry.get('toggle-me')!.enabled).toBe(false);
    expect(registry.toggle('toggle-me', true)).toBe(true);
    expect(registry.get('toggle-me')!.enabled).toBe(true);
  });

  it('should get default sandbox config per type', () => {
    const engineSandbox = registry.getDefaultSandbox('engine');
    expect(engineSandbox.maxMemoryMB).toBe(256);
    expect(engineSandbox.readOnly).toBe(false);

    const ruleSandbox = registry.getDefaultSandbox('rule-pack');
    expect(ruleSandbox.readOnly).toBe(true);
    expect(ruleSandbox.networkAccess).toBe(false);

    const connectorSandbox = registry.getDefaultSandbox('connector');
    expect(connectorSandbox.networkAccess).toBe(true);
  });

  it('should record plugin runs', () => {
    const manifest: PluginManifest = {
      name: 'counter',
      version: '1.0.0',
      description: 'Count',
      author: 'test',
      license: 'MIT',
      type: 'engine',
      minAcgVersion: '0.1.0',
      permissions: [],
      entry: 'dist/index.js',
    };

    registry.install(manifest);
    registry.recordRun('counter');
    registry.recordRun('counter');
    registry.recordRun('counter');

    const plugin = registry.get('counter');
    expect(plugin!.runCount).toBe(3);
    expect(plugin!.lastRun).toBeDefined();
  });

  it('should have correct plugin types', () => {
    const types: PluginType[] = ['engine', 'rule-pack', 'connector', 'dashboard', 'middleware', 'notifier'];
    for (const manifest of registry.listAvailable()) {
      expect(types).toContain(manifest.type);
    }
  });

  it('all community plugins should pass validation', () => {
    for (const manifest of registry.listAvailable()) {
      const result = registry.validate(manifest);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    }
  });
});
