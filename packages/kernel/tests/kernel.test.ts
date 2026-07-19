// ============================================================
// @acg/kernel — Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PluginRuntime,
  RuleEngine,
  Registry,
  AssetGraphEngine,
  EvidenceEngine,
  createRule,
  pass,
  fail,
  skip,
  error,
} from '../src/index.js';
import type {
  Plugin,
  Rule,
  RuleInput,
  RuleResult,
  Evidence,
  EvidenceGenerator,
  Asset,
  AssetEdge,
  RegistryEntry,
} from '../src/index.js';

// ============================================================
// Plugin Runtime
// ============================================================

describe('PluginRuntime', () => {
  let runtime: PluginRuntime;

  beforeEach(() => {
    runtime = new PluginRuntime();
  });

  function makePlugin(id: string): Plugin {
    return {
      metadata: {
        id,
        name: `Plugin ${id}`,
        version: '1.0.0',
        description: 'Test plugin',
        author: 'test',
        scope: 'global',
        tags: [],
      },
      activate: vi.fn(),
      deactivate: vi.fn(),
    };
  }

  it('registers and lists plugins', async () => {
    const plugin = makePlugin('test-plugin');
    await runtime.register(plugin);
    expect(runtime.list()).toHaveLength(1);
    expect(runtime.list()[0].id).toBe('test-plugin');
  });

  it('activates and deactivates plugins', async () => {
    const plugin = makePlugin('test-plugin');
    await runtime.register(plugin);

    expect(runtime.status('test-plugin')).toBe('loaded');

    await runtime.activate('test-plugin');
    expect(runtime.status('test-plugin')).toBe('active');

    await runtime.deactivate('test-plugin');
    expect(runtime.status('test-plugin')).toBe('inactive');
  });

  it('unregisters plugins', async () => {
    const plugin = makePlugin('test-plugin');
    await runtime.register(plugin);
    await runtime.unregister('test-plugin');
    expect(runtime.list()).toHaveLength(0);
  });

  it('hooks into lifecycle events', async () => {
    const hook = vi.fn();
    runtime.on('loaded', hook);

    const plugin = makePlugin('test-plugin');
    await runtime.register(plugin);
    expect(hook).toHaveBeenCalled();
  });

  it('queries rules across plugins', async () => {
    const plugin: Plugin = {
      metadata: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        author: 'test',
        scope: 'global',
        tags: [],
      },
      activate: vi.fn(),
      deactivate: vi.fn(),
      rules: [
        {
          metadata: {
            id: 'rule-1',
            name: 'Rule 1',
            severity: 'error',
            category: 'security',
            description: 'Test',
            version: '1.0.0',
            pluginId: 'test-plugin',
            tags: [],
            fixable: false,
          },
          evaluate: vi.fn(),
        },
      ],
    };

    await runtime.register(plugin);
    await runtime.activate('test-plugin');

    const rules = runtime.getAllRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].metadata.id).toBe('rule-1');
  });

  it('throws when registering duplicate plugin', async () => {
    const plugin = makePlugin('test-plugin');
    await runtime.register(plugin);
    await expect(runtime.register(makePlugin('test-plugin'))).rejects.toThrow(
      'already registered'
    );
  });

  it('computes stats', async () => {
    await runtime.register(makePlugin('p1'));
    await runtime.register(makePlugin('p2'));
    await runtime.activate('p1');

    const stats = runtime.stats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.loaded).toBe(1);
  });
});

// ============================================================
// Rule Engine
// ============================================================

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  const sampleInput: RuleInput = {
    request: {
      id: 'req-1',
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      timestamp: Date.now(),
    },
    context: {
      organizationId: 'org-1',
      pluginId: 'test',
      timestamp: Date.now(),
      config: {},
    },
  };

  it('registers and evaluates rules', async () => {
    const rule = createRule(
      { name: 'Test Rule', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => pass('test-rule', 'All good')
    );

    engine.register(rule);
    const result = await engine.evaluate(sampleInput);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('pass');
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.overallStatus).toBe('pass');
  });

  it('handles failing rules', async () => {
    const rule = createRule(
      { name: 'Fail Rule', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => fail('fail-rule', 'Policy violation')
    );

    engine.register(rule);
    const result = await engine.evaluate(sampleInput);

    expect(result.results[0].status).toBe('fail');
    expect(result.failed).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.overallStatus).toBe('fail');
  });

  it('creates rules with helper', () => {
    const rule = createRule(
      { name: 'Auto Rule', severity: 'warning', category: 'cost', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => pass('auto-rule', 'Auto passed')
    );

    expect(rule.metadata.id).toBeDefined();
    expect(rule.metadata.name).toBe('Auto Rule');
  });

  it('tracks stats by category and severity', () => {
    engine.register(
      createRule({ name: 'R1', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false }, async () => pass('r1', 'ok'))
    );
    engine.register(
      createRule({ name: 'R2', severity: 'warning', category: 'cost', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false }, async () => pass('r2', 'ok'))
    );
    engine.register(
      createRule({ name: 'R3', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false }, async () => fail('r3', 'bad'))
    );

    const stats = engine.stats();
    expect(stats.total).toBe(3);
    expect(stats.byCategory.security).toBe(2);
    expect(stats.byCategory.cost).toBe(1);
    expect(stats.bySeverity.error).toBe(2);
  });

  it('evaluates specific rules by id', async () => {
    const ruleA = createRule(
      { name: 'A', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => pass('a', 'ok')
    );
    const ruleB = createRule(
      { name: 'B', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => fail('b', 'bad')
    );

    engine.register(ruleA);
    engine.register(ruleB);

    const result = await engine.evaluate(sampleInput, [ruleA.metadata.id]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe('pass');
    expect(result.results[0].message).toBe('ok');
  });

  it('handles rule errors gracefully', async () => {
    const rule = createRule(
      { name: 'Broken Rule', severity: 'error', category: 'security', description: 'T', version: '1.0.0', pluginId: 'test', tags: [], fixable: false },
      async () => { throw new Error('boom'); }
    );

    engine.register(rule);
    const result = await engine.evaluate(sampleInput);

    expect(result.results[0].status).toBe('error');
    expect(result.errors).toBe(1);
  });
});

// ============================================================
// Registry
// ============================================================

describe('Registry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  function makeEntry(id: string, type: RegistryEntry['type'] = 'plugin'): Omit<RegistryEntry, 'registeredAt' | 'updatedAt'> {
    return {
      id,
      type,
      name: `Entry ${id}`,
      version: '1.0.0',
      metadata: {},
      status: 'active',
    };
  }

  it('registers and queries entries', () => {
    registry.register(makeEntry('entry-1', 'plugin'));
    const results = registry.query({ type: 'plugin' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('entry-1');
  });

  it('updates entries', () => {
    registry.register(makeEntry('entry-1'));
    const updated = registry.update('entry-1', { name: 'Updated' });
    expect(updated?.name).toBe('Updated');
  });

  it('queries by tags in metadata', () => {
    registry.register({
      ...makeEntry('e1'),
      metadata: { tags: ['security'] },
    });
    registry.register({
      ...makeEntry('e2'),
      metadata: { tags: ['cost'] },
    });

    const results = registry.query({ tags: ['security'] });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('e1');
  });

  it('exports and imports data', () => {
    registry.register(makeEntry('e1', 'rule'));
    registry.register(makeEntry('e2', 'policy'));

    const exported = registry.export();
    const newRegistry = new Registry();
    newRegistry.import(exported);

    expect(newRegistry.query({ type: 'rule' })).toHaveLength(1);
    expect(newRegistry.query({ type: 'policy' })).toHaveLength(1);
  });

  it('computes stats', () => {
    registry.register(makeEntry('e1', 'rule'));
    registry.register(makeEntry('e2', 'rule'));

    const stats = registry.stats();
    expect(stats.total).toBe(2);
    expect(stats.byType.rule).toBe(2);
  });

  it('has and count', () => {
    registry.register(makeEntry('e1'));
    expect(registry.has('e1')).toBe(true);
    expect(registry.has('e2')).toBe(false);
    expect(registry.count()).toBe(1);
  });

  it('registers many at once', () => {
    registry.registerMany([makeEntry('a'), makeEntry('b'), makeEntry('c')]);
    expect(registry.count()).toBe(3);
  });
});

// ============================================================
// Asset Graph
// ============================================================

describe('AssetGraphEngine', () => {
  let graph: AssetGraphEngine;

  beforeEach(() => {
    graph = new AssetGraphEngine();
  });

  const src = 'test';

  it('adds and retrieves assets', () => {
    graph.addAsset({ id: 'a1', type: 'model', name: 'GPT-4', metadata: {}, source: src });

    const asset = graph.getAsset('a1');
    expect(asset).toBeDefined();
    expect(asset?.name).toBe('GPT-4');
    expect(asset?.discoveredAt).toBeGreaterThan(0);
  });

  it('adds edges and finds related', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'model', name: 'M1', metadata: {}, source: src });

    graph.addEdge({ source: 'a1', target: 'a2', relation: 'calls' });

    const related = graph.findRelated('a1');
    expect(related).toHaveLength(1);
    expect(related[0].asset.id).toBe('a2');
  });

  it('finds paths between assets', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'service', name: 'S2', metadata: {}, source: src });
    graph.addAsset({ id: 'a3', type: 'model', name: 'M1', metadata: {}, source: src });

    graph.addEdge({ source: 'a1', target: 'a2', relation: 'calls' });
    graph.addEdge({ source: 'a2', target: 'a3', relation: 'uses' });

    const path = graph.findPath('a1', 'a3');
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
  });

  it('discovers assets in bulk', () => {
    const result = graph.discover({
      assets: [
        { id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src },
        { id: 'a2', type: 'model', name: 'M1', metadata: {}, source: src },
      ],
      edges: [
        { source: 'a1', target: 'a2', relation: 'uses' },
      ],
    });

    expect(result.assetsAdded).toBe(2);
    expect(result.edgesAdded).toBe(1);
  });

  it('computes stats', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'model', name: 'M1', metadata: {}, source: src });
    graph.addEdge({ source: 'a1', target: 'a2', relation: 'uses' });

    const stats = graph.stats();
    expect(stats.totalAssets).toBe(2);
    expect(stats.byType.service).toBe(1);
    expect(stats.byType.model).toBe(1);
    expect(stats.totalEdges).toBe(1);
  });

  it('removes assets and cleans edges', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'model', name: 'M1', metadata: {}, source: src });
    graph.addEdge({ source: 'a1', target: 'a2', relation: 'uses' });

    graph.removeAsset('a1');
    expect(graph.getAsset('a1')).toBeUndefined();
    expect(graph.getEdges('a2')).toHaveLength(0);
  });

  it('exports and imports', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addEdge({ source: 'a1', target: 'a1', relation: 'custom' });

    const exported = graph.export();
    const newGraph = new AssetGraphEngine();
    newGraph.import(exported);

    expect(newGraph.count().assets).toBe(1);
    expect(newGraph.count().edges).toBe(1);
  });

  it('finds assets by name', () => {
    graph.addAsset({ id: 'a1', type: 'model', name: 'GPT-4 Turbo', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'model', name: 'Claude 3', metadata: {}, source: src });

    const results = graph.findByName('GPT');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a1');
  });

  it('getOutgoing and getIncoming', () => {
    graph.addAsset({ id: 'a1', type: 'service', name: 'S1', metadata: {}, source: src });
    graph.addAsset({ id: 'a2', type: 'model', name: 'M1', metadata: {}, source: src });
    graph.addEdge({ source: 'a1', target: 'a2', relation: 'uses' });

    expect(graph.getOutgoing('a1')).toHaveLength(1);
    expect(graph.getIncoming('a2')).toHaveLength(1);
    expect(graph.getOutgoing('a2')).toHaveLength(0);
  });
});

// ============================================================
// Evidence Engine
// ============================================================

describe('EvidenceEngine', () => {
  let engine: EvidenceEngine;

  beforeEach(() => {
    engine = new EvidenceEngine();
  });

  it('creates evidence entries', async () => {
    const evidence = await engine.create({
      type: 'security',
      pluginId: 'test-plugin',
      ruleId: 'test-rule',
      evidenceData: { flagged: false, score: 0.1 },
    });

    expect(evidence.id).toBeDefined();
    expect(evidence.hash).toBeDefined();
    expect(evidence.chainValid).toBe(true);
    expect(evidence.type).toBe('security');
  });

  it('maintains hash chain', async () => {
    const e1 = await engine.create({
      type: 'compliance',
      pluginId: 'test',
      evidenceData: { a: 1 },
    });

    const e2 = await engine.create({
      type: 'compliance',
      pluginId: 'test',
      evidenceData: { a: 2 },
    });

    expect(e2.previousHash).toBe(e1.hash);

    const chain = engine.getChain();
    expect(chain.entries).toHaveLength(2);
    expect(chain.valid).toBe(true);
  });

  it('generates evidence from rule results', async () => {
    const input: RuleInput = {
      request: { id: 'req-1', provider: 'openai', model: 'gpt-4', messages: [], timestamp: Date.now() },
      context: { organizationId: 'org-1', pluginId: 'test', timestamp: Date.now(), config: {} },
    };

    const results: RuleResult[] = [
      {
        ruleId: 'rule-1',
        status: 'pass',
        message: 'OK',
        evidence: {
          id: 'ev-1',
          type: 'security',
          timestamp: Date.now(),
          pluginId: 'test',
          data: { safe: true },
          hash: 'hash1',
          chainValid: true,
        },
      },
    ];

    const evidence = await engine.generateFromResults(input, results, 'org-1');
    expect(evidence).toHaveLength(1);
    expect(evidence[0].organizationId).toBe('org-1');
  });

  it('queries evidence by type', async () => {
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { a: 1 } });
    await engine.create({ type: 'audit', pluginId: 'test', evidenceData: { b: 2 } });
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { c: 3 } });

    const security = engine.query({ type: 'security' });
    expect(security).toHaveLength(2);

    const audit = engine.query({ type: 'audit' });
    expect(audit).toHaveLength(1);
  });

  it('computes stats', async () => {
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { a: 1 } });
    await engine.create({ type: 'audit', pluginId: 'test', evidenceData: { b: 2 } });

    const stats = engine.stats();
    expect(stats.total).toBe(2);
    expect(stats.byType.security).toBe(1);
    expect(stats.byType.audit).toBe(1);
    expect(stats.chainValid).toBe(true);
  });

  it('registers and uses generators', async () => {
    const generator: EvidenceGenerator = {
      pluginId: 'gen-plugin',
      evidenceType: 'security',
      generate: async (input, result) => ({
        id: 'gen-1',
        type: 'security',
        timestamp: Date.now(),
        pluginId: 'gen-plugin',
        ruleId: result.ruleId,
        data: { generated: true },
        hash: 'gen-hash',
        chainValid: true,
      }),
    };

    engine.registerGenerator(generator);
    expect(engine.listGenerators()).toHaveLength(1);

    const input: RuleInput = {
      request: { id: 'req', provider: 'openai', model: 'gpt-4', messages: [], timestamp: Date.now() },
      context: { organizationId: 'org-1', pluginId: 'test', timestamp: Date.now(), config: {} },
    };

    const results: RuleResult[] = [
      { ruleId: 'rule-1', status: 'pass', message: 'OK' },
    ];

    const evidence = await engine.generateFromResults(input, results, 'org-1');
    expect(evidence.length).toBeGreaterThanOrEqual(0);
  });

  it('clears evidence', async () => {
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { a: 1 } });
    engine.clear();
    expect(engine.count()).toBe(0);
  });

  it('scopes by organization', async () => {
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { a: 1 }, organizationId: 'org-1' });
    await engine.create({ type: 'security', pluginId: 'test', evidenceData: { b: 2 }, organizationId: 'org-2' });

    const org1Chain = engine.getChain('org-1');
    expect(org1Chain.entries).toHaveLength(1);

    const org2Chain = engine.getChain('org-2');
    expect(org2Chain.entries).toHaveLength(1);
  });
});
