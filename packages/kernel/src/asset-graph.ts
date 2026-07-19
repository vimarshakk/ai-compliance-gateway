// ============================================================
// @acg/kernel — Asset Graph
// ============================================================
// Auto-discovers AI assets and generates an organization-level
// graph. Powers AI-BOM, Risk, Compliance, Cost, Governance.
// ============================================================

import type {
  Asset,
  AssetType,
  AssetEdge,
  AssetRelation,
  AssetGraph,
  AssetStats,
} from './types.js';

export class AssetGraphEngine {
  private assetMap = new Map<string, Asset>();
  private edgeList: AssetEdge[] = [];

  // ---- Asset Management ----

  addAsset(asset: Omit<Asset, 'discoveredAt' | 'updatedAt'>): Asset {
    const now = Date.now();
    const existing = this.assetMap.get(asset.id);

    const full: Asset = {
      ...asset,
      discoveredAt: existing?.discoveredAt ?? now,
      updatedAt: now,
    };

    this.assetMap.set(asset.id, full);
    return full;
  }

  updateAsset(id: string, updates: Partial<Asset>): Asset | undefined {
    const asset = this.assetMap.get(id);
    if (!asset) return undefined;

    const updated: Asset = {
      ...asset,
      ...updates,
      id: asset.id,
      updatedAt: Date.now(),
    };

    this.assetMap.set(id, updated);
    return updated;
  }

  removeAsset(id: string): boolean {
    const deleted = this.assetMap.delete(id);
    if (deleted) {
      this.edgeList = this.edgeList.filter((e) => e.source !== id && e.target !== id);
    }
    return deleted;
  }

  getAsset(id: string): Asset | undefined {
    return this.assetMap.get(id);
  }

  // ---- Edge Management ----

  addEdge(edge: AssetEdge): void {
    const exists = this.edgeList.some(
      (e) => e.source === edge.source && e.target === edge.target && e.relation === edge.relation
    );
    if (!exists) {
      this.edgeList.push(edge);
    }
  }

  removeEdge(source: string, target: string, relation?: AssetRelation): number {
    const before = this.edgeList.length;
    this.edgeList = this.edgeList.filter(
      (e) =>
        !(e.source === source && e.target === target && (relation ? e.relation === relation : true))
    );
    return before - this.edgeList.length;
  }

  getEdges(assetId: string): AssetEdge[] {
    return this.edgeList.filter((e) => e.source === assetId || e.target === assetId);
  }

  getIncoming(assetId: string): AssetEdge[] {
    return this.edgeList.filter((e) => e.target === assetId);
  }

  getOutgoing(assetId: string): AssetEdge[] {
    return this.edgeList.filter((e) => e.source === assetId);
  }

  // ---- Discovery ----

  discover(discovery: {
    assets?: Omit<Asset, 'discoveredAt' | 'updatedAt'>[];
    edges?: AssetEdge[];
  }): { assetsAdded: number; edgesAdded: number } {
    let assetsAdded = 0;
    let edgesAdded = 0;

    if (discovery.assets) {
      for (const asset of discovery.assets) {
        this.addAsset(asset);
        assetsAdded++;
      }
    }

    if (discovery.edges) {
      for (const edge of discovery.edges) {
        const exists = this.edgeList.some(
          (e) => e.source === edge.source && e.target === edge.target && e.relation === edge.relation
        );
        if (!exists) {
          this.edgeList.push(edge);
          edgesAdded++;
        }
      }
    }

    return { assetsAdded, edgesAdded };
  }

  // ---- Query ----

  getAssets(type?: AssetType): Asset[] {
    const all = Array.from(this.assetMap.values());
    return type ? all.filter((a) => a.type === type) : all;
  }

  findByType(type: AssetType): Asset[] {
    return this.getAssets(type);
  }

  findByName(name: string): Asset[] {
    const lower = name.toLowerCase();
    return Array.from(this.assetMap.values()).filter((a) => a.name.toLowerCase().includes(lower));
  }

  findRelated(assetId: string): { asset: Asset; edges: AssetEdge[] }[] {
    const related = new Map<string, { asset: Asset; edges: AssetEdge[] }>();

    for (const edge of this.edgeList) {
      if (edge.source === assetId) {
        const asset = this.assetMap.get(edge.target);
        if (asset) {
          if (!related.has(edge.target)) {
            related.set(edge.target, { asset, edges: [] });
          }
          related.get(edge.target)!.edges.push(edge);
        }
      }
      if (edge.target === assetId) {
        const asset = this.assetMap.get(edge.source);
        if (asset) {
          if (!related.has(edge.source)) {
            related.set(edge.source, { asset, edges: [] });
          }
          related.get(edge.source)!.edges.push(edge);
        }
      }
    }

    return Array.from(related.values());
  }

  // ---- Path Finding ----

  findPath(from: string, to: string, maxDepth: number = 5): AssetEdge[] | null {
    const visited = new Set<string>();
    const path: AssetEdge[] = [];

    const dfs = (current: string, depth: number): boolean => {
      if (depth > maxDepth) return false;
      if (current === to) return true;
      if (visited.has(current)) return false;

      visited.add(current);

      for (const edge of this.edgeList) {
        if (edge.source === current) {
          const asset = this.assetMap.get(edge.target);
          if (asset && !visited.has(edge.target)) {
            path.push(edge);
            if (dfs(edge.target, depth + 1)) return true;
            path.pop();
          }
        }
      }

      return false;
    };

    return dfs(from, 0) ? path : null;
  }

  // ---- Export ----

  graph(): AssetGraph {
    const assets = Array.from(this.assetMap.values());
    return {
      assets,
      edges: [...this.edgeList],
      stats: this.computeStats(assets, this.edgeList),
    };
  }

  // ---- Stats ----

  stats(): AssetStats {
    const assets = Array.from(this.assetMap.values());
    return this.computeStats(assets, this.edgeList);
  }

  private computeStats(assets: Asset[], edges: AssetEdge[]): AssetStats {
    const byType = {} as Record<AssetType, number>;
    for (const a of assets) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
    }

    const byRelation = {} as Record<AssetRelation, number>;
    for (const e of edges) {
      byRelation[e.relation] = (byRelation[e.relation] ?? 0) + 1;
    }

    return {
      totalAssets: assets.length,
      byType,
      totalEdges: edges.length,
      byRelation,
      lastScan: assets.reduce((max, a) => Math.max(max, a.updatedAt), 0),
    };
  }

  // ---- Bulk Operations ----

  clear(): void {
    this.assetMap.clear();
    this.edgeList = [];
  }

  export(): { assets: Asset[]; edges: AssetEdge[] } {
    return {
      assets: Array.from(this.assetMap.values()),
      edges: [...this.edgeList],
    };
  }

  import(data: { assets: Asset[]; edges: AssetEdge[] }): void {
    for (const asset of data.assets) {
      this.assetMap.set(asset.id, asset);
    }
    this.edgeList.push(...data.edges);
  }

  count(): { assets: number; edges: number } {
    return { assets: this.assetMap.size, edges: this.edgeList.length };
  }
}
