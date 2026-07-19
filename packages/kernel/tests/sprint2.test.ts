import { describe, it, expect } from 'vitest';
import { bomToGraph, type BomResult } from '../src/bom-adapter.js';
import { ComplianceScoreEngine, type ScanSummary } from '../src/compliance-score.js';

// ---- BOM Adapter Tests ----

function makeBom(overrides: Partial<BomResult> = {}): BomResult {
  return {
    rootPath: '/test',
    generatedAt: new Date().toISOString(),
    entries: [
      { category: 'model', name: 'GPT-4o', confidence: 'high' },
      { category: 'framework', name: 'LangChain', confidence: 'high' },
      { category: 'database', name: 'Qdrant', confidence: 'high' },
      { category: 'observability', name: 'Langfuse', confidence: 'high' },
      { category: 'guardrail', name: 'OPA', confidence: 'high' },
    ],
    categories: {
      model: [{ category: 'model', name: 'GPT-4o', confidence: 'high' }],
      framework: [{ category: 'framework', name: 'LangChain', confidence: 'high' }],
      database: [{ category: 'database', name: 'Qdrant', confidence: 'high' }],
      observability: [{ category: 'observability', name: 'Langfuse', confidence: 'high' }],
      guardrail: [{ category: 'guardrail', name: 'OPA', confidence: 'high' }],
    },
    ...overrides,
  };
}

describe('bomToGraph', () => {
  it('converts BOM entries to assets', () => {
    const result = bomToGraph(makeBom());
    expect(result.assets.length).toBe(5);
  });

  it('maps BOM categories to asset types', () => {
    const result = bomToGraph(makeBom());
    const model = result.assets.find(a => a.name === 'GPT-4o');
    expect(model?.type).toBe('model');

    const framework = result.assets.find(a => a.name === 'LangChain');
    expect(framework?.type).toBe('tool');

    const db = result.assets.find(a => a.name === 'Qdrant');
    expect(db?.type).toBe('provider');
  });

  it('infers framework→model edges', () => {
    const result = bomToGraph(makeBom());
    const fwId = result.assets.find(a => a.name === 'LangChain')!.id;
    const modelId = result.assets.find(a => a.name === 'GPT-4o')!.id;
    const edge = result.edges.find(e => e.source === fwId && e.target === modelId);
    expect(edge).toBeDefined();
    expect(edge!.relation).toBe('uses');
  });

  it('infers framework→database edges', () => {
    const result = bomToGraph(makeBom());
    const fwId = result.assets.find(a => a.name === 'LangChain')!.id;
    const dbId = result.assets.find(a => a.name === 'Qdrant')!.id;
    const edge = result.edges.find(e => e.source === fwId && e.target === dbId);
    expect(edge).toBeDefined();
    expect(edge!.relation).toBe('accesses');
  });

  it('infers framework→guardrail edges', () => {
    const result = bomToGraph(makeBom());
    const fwId = result.assets.find(a => a.name === 'LangChain')!.id;
    const grId = result.assets.find(a => a.name === 'OPA')!.id;
    const edge = result.edges.find(e => e.source === fwId && e.target === grId);
    expect(edge).toBeDefined();
    expect(edge!.relation).toBe('configured-by');
  });

  it('infers framework→tool edges', () => {
    const result = bomToGraph(makeBom());
    const fwId = result.assets.find(a => a.name === 'LangChain')!.id;
    const obsId = result.assets.find(a => a.name === 'Langfuse')!.id;
    const edge = result.edges.find(e => e.source === fwId && e.target === obsId);
    expect(edge).toBeDefined();
    expect(edge!.relation).toBe('depends-on');
  });

  it('handles empty BOM', () => {
    const result = bomToGraph(makeBom({ entries: [], categories: {} }));
    expect(result.assets.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it('deduplicates assets with same name', () => {
    const bom = makeBom({
      entries: [
        { category: 'model', name: 'GPT-4o', confidence: 'high' },
        { category: 'model', name: 'GPT-4o', confidence: 'medium' },
      ],
      categories: {
        model: [
          { category: 'model', name: 'GPT-4o', confidence: 'high' },
          { category: 'model', name: 'GPT-4o', confidence: 'medium' },
        ],
      },
    });
    const result = bomToGraph(bom);
    expect(result.assets.length).toBe(1);
  });

  it('preserves metadata from BOM entry', () => {
    const result = bomToGraph(makeBom());
    const model = result.assets.find(a => a.name === 'GPT-4o');
    expect(model?.metadata.bomCategory).toBe('model');
    expect(model?.metadata.confidence).toBe('high');
    expect(model?.source).toBe('bom');
  });
});

// ---- Compliance Score Engine Tests ----

describe('ComplianceScoreEngine', () => {
  const engine = new ComplianceScoreEngine();

  function makeScan(overrides: Partial<ScanSummary> = {}): ScanSummary {
    return {
      sdks: ['openai'],
      promptsFound: 0,
      secretsFound: 0,
      envVarsFound: 0,
      configsFound: 0,
      modelRefs: [],
      riskScore: 0,
      ...overrides,
    };
  }

  it('returns 100/100 for clean project with full coverage', () => {
    const bomEntries = [
      { category: 'guardrail', name: 'OPA', confidence: 'high' as const },
      { category: 'guardrail', name: 'NeMo', confidence: 'high' as const },
      { category: 'observability', name: 'Langfuse', confidence: 'high' as const },
      { category: 'observability', name: 'LangSmith', confidence: 'high' as const },
    ];
    const result = engine.calculate(makeScan({ sdks: ['openai'], configsFound: 1 }), bomEntries);
    expect(result.overallScore).toBe(100);
    expect(result.maxScore).toBe(100);
    expect(result.percentage).toBe(100);
  });

  it('deducts for secrets', () => {
    const result = engine.calculate(makeScan({ secretsFound: 1 }), []);
    const secretBreakdown = result.breakdowns.find(b => b.category === 'Secret Management');
    expect(secretBreakdown!.score).toBe(0);
  });

  it('deducts for env vars', () => {
    const result = engine.calculate(makeScan({ envVarsFound: 5 }), []);
    const envBreakdown = result.breakdowns.find(b => b.category === 'Environment Hygiene');
    expect(envBreakdown!.score).toBe(0);
  });

  it('scores guardrails from BOM', () => {
    const bomEntries = [{ category: 'guardrail', name: 'OPA', confidence: 'high' as const }];
    const result = engine.calculate(makeScan(), bomEntries);
    const guardrailBreakdown = result.breakdowns.find(b => b.category === 'Guardrail Coverage');
    expect(guardrailBreakdown!.score).toBe(10);
  });

  it('scores observability from BOM', () => {
    const bomEntries = [{ category: 'observability', name: 'Langfuse', confidence: 'high' as const }];
    const result = engine.calculate(makeScan(), bomEntries);
    const obsBreakdown = result.breakdowns.find(b => b.category === 'Observability');
    expect(obsBreakdown!.score).toBe(5);
  });

  it('generates recommendations for poor posture', () => {
    const result = engine.calculate(makeScan({ secretsFound: 1, envVarsFound: 3 }), []);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.includes('Rotate detected secrets'))).toBe(true);
  });

  it('returns "Strong compliance posture" for 80%+', () => {
    const result = engine.calculate(makeScan({ sdks: ['openai'] }), []);
    // Score: Secrets 25 + SDK 10 + Env 15 + Guardrails 0 + Obs 0 + Prompts 10 = 60
    // Not 80%+ without guardrails. Let's test the other way.
    const bomEntries = [
      { category: 'guardrail', name: 'OPA', confidence: 'high' as const },
      { category: 'observability', name: 'Langfuse', confidence: 'high' as const },
    ];
    const result2 = engine.calculate(makeScan({ sdks: ['openai'], configsFound: 1 }), bomEntries);
    // Secrets 25 + SDK 20 + Env 15 + Guardrails 10 + Obs 5 + Prompts 10 = 85
    expect(result2.recommendations.some(r => r.includes('Strong compliance posture'))).toBe(true);
  });

  it('has exactly 6 breakdown categories', () => {
    const result = engine.calculate(makeScan(), []);
    expect(result.breakdowns.length).toBe(6);
  });

  it('all breakdown maxScores sum to 100', () => {
    const result = engine.calculate(makeScan(), []);
    const totalMax = result.breakdowns.reduce((s, b) => s + b.maxScore, 0);
    expect(totalMax).toBe(100);
  });
});
