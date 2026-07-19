import type { FastifyInstance } from 'fastify';
import { ComplianceScoreEngine, bomToGraph } from '@acg/kernel';

export async function kernelRoute(app: FastifyInstance) {
  // GET /kernel/stats — aggregated kernel stats
  app.get('/stats', {
    schema: {
      tags: ['Kernel'],
      summary: 'Kernel component statistics',
      description: 'Returns stats from all kernel components.',
      response: { 200: { description: 'Kernel stats' } },
    },
  }, async () => {
    const kernel = (app as any).kernel;
    return {
      timestamp: new Date().toISOString(),
      pluginRuntime: kernel.runtime.stats(),
      ruleEngine: kernel.ruleEngine.stats(),
      registry: kernel.registry.stats(),
      assetGraph: kernel.assetGraph.stats(),
      evidenceEngine: kernel.evidenceEngine.stats(),
    };
  });

  // POST /kernel/asset-graph/discover — discover assets from BOM data
  app.post('/asset-graph/discover', {
    schema: {
      tags: ['Kernel'],
      summary: 'Discover assets from BOM data',
      description: 'Accepts BOM entries and populates the asset graph with assets and dependency edges.',
      body: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                name: { type: 'string' },
                version: { type: 'string' },
                source: { type: 'string' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
              required: ['category', 'name', 'confidence'],
            },
          },
          rootPath: { type: 'string' },
        },
        required: ['entries'],
      },
      response: { 200: { description: 'Discovery results' } },
    },
  }, async (request) => {
    const kernel = (app as any).kernel;
    const { entries, rootPath } = request.body as any;

    const bom = {
      rootPath: rootPath ?? '.',
      generatedAt: new Date().toISOString(),
      entries,
      categories: {} as Record<string, any[]>,
    };

    // Group by category
    for (const entry of entries) {
      if (!bom.categories[entry.category]) bom.categories[entry.category] = [];
      bom.categories[entry.category].push(entry);
    }

    const { assets, edges } = bomToGraph(bom);

    // Add to asset graph
    let assetsAdded = 0;
    for (const asset of assets) {
      try {
        kernel.assetGraph.addAsset(asset);
        assetsAdded++;
      } catch { /* duplicate, skip */ }
    }

    for (const edge of edges) {
      try {
        kernel.assetGraph.addEdge(edge);
      } catch { /* duplicate, skip */ }
    }

    return {
      assetsDiscovered: assets.length,
      assetsAdded,
      edgesAdded: edges.length,
      stats: kernel.assetGraph.stats(),
    };
  });

  // GET /kernel/asset-graph — query assets with optional filter
  app.get('/asset-graph', {
    schema: {
      tags: ['Kernel'],
      summary: 'Query assets in the asset graph',
      description: 'Returns assets with optional type filtering.',
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
        },
      },
      response: { 200: { description: 'Assets list' } },
    },
  }, async (request) => {
    const kernel = (app as any).kernel;
    const { type, name } = request.query as any;

    let assets = kernel.assetGraph.getAssets();
    if (type) assets = assets.filter((a: any) => a.type === type);
    if (name) assets = assets.filter((a: any) => a.name.toLowerCase().includes(name.toLowerCase()));

    return {
      count: assets.length,
      assets,
      stats: kernel.assetGraph.stats(),
    };
  });

  // GET /kernel/evidence — query evidence chain
  app.get('/evidence', {
    schema: {
      tags: ['Kernel'],
      summary: 'Query evidence chain',
      description: 'Returns evidence records with optional filters.',
      querystring: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
          type: { type: 'string' },
          pluginId: { type: 'string' },
          ruleId: { type: 'string' },
          limit: { type: 'number' },
        },
      },
      response: { 200: { description: 'Evidence records' } },
    },
  }, async (request) => {
    const kernel = (app as any).kernel;
    const { organizationId, type, pluginId, ruleId, limit } = request.query as any;

    const results = kernel.evidenceEngine.query({
      organizationId,
      type,
      pluginId,
      ruleId,
    });

    return {
      count: results.length,
      evidence: results.slice(0, limit ?? 100),
      stats: kernel.evidenceEngine.stats(),
    };
  });

  // POST /kernel/evidence/verify — verify evidence chain integrity
  app.post('/evidence/verify', {
    schema: {
      tags: ['Kernel'],
      summary: 'Verify evidence chain integrity',
      description: 'Validates SHA-256 hash chain for an organization.',
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string' },
        },
        required: ['organizationId'],
      },
      response: { 200: { description: 'Verification result' } },
    },
  }, async (request) => {
    const kernel = (app as any).kernel;
    const { organizationId } = request.body as any;
    const chain = kernel.evidenceEngine.getChain(organizationId);
    return { organizationId, chain };
  });

  // POST /kernel/compliance/score — calculate compliance score
  app.post('/compliance/score', {
    schema: {
      tags: ['Kernel'],
      summary: 'Calculate compliance score',
      description: 'Computes a compliance score from scan findings and BOM entries.',
      body: {
        type: 'object',
        properties: {
          scan: {
            type: 'object',
            properties: {
              sdks: { type: 'array', items: { type: 'string' } },
              promptsFound: { type: 'number' },
              secretsFound: { type: 'number' },
              envVarsFound: { type: 'number' },
              configsFound: { type: 'number' },
              modelRefs: { type: 'array', items: { type: 'string' } },
              riskScore: { type: 'number' },
            },
            required: ['sdks', 'promptsFound', 'secretsFound', 'envVarsFound', 'configsFound', 'modelRefs', 'riskScore'],
          },
          bom: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                name: { type: 'string' },
                confidence: { type: 'string' },
              },
            },
          },
        },
        required: ['scan'],
      },
      response: { 200: { description: 'Compliance score result' } },
    },
  }, async (request) => {
    const { scan, bom } = request.body as any;
    const engine = new ComplianceScoreEngine();
    const result = engine.calculate(scan, bom ?? []);
    return result;
  });
}
