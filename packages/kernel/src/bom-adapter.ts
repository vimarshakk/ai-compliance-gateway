// ============================================================
// @acg/kernel — BOM-to-AssetGraph Adapter
// ============================================================
// Converts BOM scan results into Assets and Edges for the
// AssetGraphEngine. Maps BOM categories to AssetTypes and
// infers dependency edges from co-occurrence.
// ============================================================

import type { Asset, AssetEdge, AssetType } from './types.js';

// ---- BOM Types (duplicated to avoid cross-package dep) ----

export interface BomEntry {
  category: string;
  name: string;
  version?: string;
  source?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface BomResult {
  rootPath: string;
  generatedAt: string;
  entries: BomEntry[];
  categories: Record<string, BomEntry[]>;
}

// ---- Category → AssetType Mapping ----

const CATEGORY_MAP: Record<string, AssetType> = {
  model: 'model',
  framework: 'tool',
  database: 'provider',
  policy: 'policy',
  guardrail: 'tool',
  observability: 'tool',
  mcp: 'mcp-server',
  'ci-cd': 'connector',
  'compliance-pack': 'policy',
  sdk: 'tool',
};

// ---- Hash Helper ----

function slugify(category: string, name: string): string {
  return `${category}--${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---- Adapter ----

export function bomToGraph(bom: BomResult): { assets: Asset[]; edges: AssetEdge[] } {
  const assets: Asset[] = [];
  const edges: AssetEdge[] = [];
  const assetIds = new Map<string, string>(); // name -> asset id

  // 1. Convert each BOM entry to an Asset
  for (const entry of bom.entries) {
    const assetType = CATEGORY_MAP[entry.category] ?? 'custom';
    const id = slugify(entry.category, entry.name);

    if (assetIds.has(entry.name)) continue;

    assets.push({
      id,
      type: assetType,
      name: entry.name,
      metadata: {
        bomCategory: entry.category,
        version: entry.version,
        confidence: entry.confidence,
        source: entry.source,
      },
      source: 'bom',
      discoveredAt: Date.now(),
      updatedAt: Date.now(),
    });

    assetIds.set(entry.name, id);
  }

  // 2. Infer edges from BOM structure
  //    - Models used by frameworks
  //    - Frameworks accessing databases
  //    - Policies enforcing models
  //    - Guardrails configured-by frameworks
  //    - Tools/connectors used by frameworks
  const frameworks = bom.categories['framework'] ?? [];
  const models = bom.categories['model'] ?? [];
  const databases = bom.categories['database'] ?? [];
  const policies = bom.categories['policy'] ?? [];
  const guardrails = bom.categories['guardrail'] ?? [];
  const tools = bom.categories['observability'] ?? [];
  const mcps = bom.categories['mcp'] ?? [];

  // Framework → Model (uses)
  for (const fw of frameworks) {
    const fwId = assetIds.get(fw.name);
    if (!fwId) continue;
    for (const model of models) {
      const modelId = assetIds.get(model.name);
      if (!modelId) continue;
      edges.push({ source: fwId, target: modelId, relation: 'uses' });
    }
  }

  // Framework → Database (accesses)
  for (const fw of frameworks) {
    const fwId = assetIds.get(fw.name);
    if (!fwId) continue;
    for (const db of databases) {
      const dbId = assetIds.get(db.name);
      if (!dbId) continue;
      edges.push({ source: fwId, target: dbId, relation: 'accesses' });
    }
  }

  // Policy → Model (enforces)
  for (const policy of policies) {
    const policyId = assetIds.get(policy.name);
    if (!policyId) continue;
    for (const model of models) {
      const modelId = assetIds.get(model.name);
      if (!modelId) continue;
      edges.push({ source: policyId, target: modelId, relation: 'enforces' });
    }
  }

  // Guardrail → Framework (configured-by, reversed: framework configured-by guardrail)
  for (const gr of guardrails) {
    const grId = assetIds.get(gr.name);
    if (!grId) continue;
    for (const fw of frameworks) {
      const fwId = assetIds.get(fw.name);
      if (!fwId) continue;
      edges.push({ source: fwId, target: grId, relation: 'configured-by' });
    }
  }

  // Tool → Framework (depends-on)
  for (const tool of [...tools, ...mcps]) {
    const toolId = assetIds.get(tool.name);
    if (!toolId) continue;
    for (const fw of frameworks) {
      const fwId = assetIds.get(fw.name);
      if (!fwId) continue;
      edges.push({ source: fwId, target: toolId, relation: 'depends-on' });
    }
  }

  return { assets, edges };
}
