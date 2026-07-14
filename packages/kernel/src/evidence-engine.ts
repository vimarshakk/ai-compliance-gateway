// ============================================================
// @acg/kernel — Evidence Engine
// ============================================================
// Continuous evidence generation. Every request becomes an
// evidence entry with hash, timestamp, policy, result, model,
// user, and organization. Reports become SQL queries.
// ============================================================

import type {
  Evidence,
  EvidenceType,
  EvidenceChain,
  EvidenceGenerator,
  RuleInput,
  RuleResult,
} from './types.js';
import { randomUUID, createHash } from 'node:crypto';

// ---- Hashing ----

function hashEvidence(data: Record<string, unknown>): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

// ---- Evidence Engine ----

export class EvidenceEngine {
  private chains = new Map<string, Evidence[]>(); // keyed by organizationId or 'global'
  private generators = new Map<string, EvidenceGenerator>();

  // ---- Generator Registration ----

  registerGenerator(generator: EvidenceGenerator): void {
    const key = `${generator.pluginId}:${generator.evidenceType}`;
    this.generators.set(key, generator);
  }

  unregisterGenerator(pluginId: string, evidenceType: EvidenceType): void {
    const key = `${pluginId}:${evidenceType}`;
    this.generators.delete(key);
  }

  listGenerators(): EvidenceGenerator[] {
    return Array.from(this.generators.values());
  }

  // ---- Evidence Creation ----

  async create(data: {
    type: EvidenceType;
    pluginId: string;
    ruleId?: string;
    requestId?: string;
    organizationId?: string;
    projectId?: string;
    evidenceData: Record<string, unknown>;
  }): Promise<Evidence> {
    const chainKey = data.organizationId ?? 'global';
    const chain = this.chains.get(chainKey) ?? [];
    const previousHash = chain.length > 0 ? chain[chain.length - 1].hash : undefined;

    const evidenceData = {
      ...data.evidenceData,
      type: data.type,
      pluginId: data.pluginId,
      ruleId: data.ruleId,
      requestId: data.requestId,
      organizationId: data.organizationId,
      projectId: data.projectId,
      timestamp: Date.now(),
    };

    const evidence: Evidence = {
      id: randomUUID(),
      type: data.type,
      timestamp: Date.now(),
      requestId: data.requestId,
      organizationId: data.organizationId,
      projectId: data.projectId,
      pluginId: data.pluginId,
      ruleId: data.ruleId,
      data: data.evidenceData,
      hash: hashEvidence(evidenceData),
      previousHash,
      chainValid: previousHash ? this.verifyPreviousHash(chain, previousHash) : true,
    };

    chain.push(evidence);
    this.chains.set(chainKey, chain);

    return evidence;
  }

  // ---- Generate from Rule Results ----

  async generateFromResults(
    input: RuleInput,
    results: RuleResult[],
    organizationId?: string
  ): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const result of results) {
      // Find applicable generators
      for (const [, generator] of this.generators) {
        if (generator.pluginId === result.evidence?.pluginId || !result.evidence) {
          const genEvidence = await generator.generate(input, result);
          genEvidence.organizationId = organizationId;
          const created = await this.create({
            type: genEvidence.type,
            pluginId: genEvidence.pluginId,
            ruleId: genEvidence.ruleId,
            requestId: input.request?.id,
            organizationId,
            projectId: input.request?.projectId,
            evidenceData: genEvidence.data,
          });
          evidence.push(created);
        }
      }

      // If result has inline evidence, store it
      if (result.evidence) {
        const created = await this.create({
          type: result.evidence.type,
          pluginId: result.evidence.pluginId,
          ruleId: result.ruleId,
          requestId: input.request?.id,
          organizationId,
          projectId: input.request?.projectId,
          evidenceData: result.evidence.data,
        });
        evidence.push(created);
      }
    }

    return evidence;
  }

  // ---- Chain Verification ----

  getChain(organizationId?: string): EvidenceChain {
    const key = organizationId ?? 'global';
    const entries = this.chains.get(key) ?? [];

    let valid = true;
    let brokenAt: number | undefined;

    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousHash !== entries[i - 1].hash) {
        valid = false;
        brokenAt = i;
        break;
      }
    }

    return { entries, valid, brokenAt };
  }

  private verifyPreviousHash(chain: Evidence[], expectedHash: string): boolean {
    if (chain.length === 0) return true;
    return chain[chain.length - 1].hash === expectedHash;
  }

  // ---- Query ----

  query(params: {
    organizationId?: string;
    type?: EvidenceType;
    pluginId?: string;
    ruleId?: string;
    requestId?: string;
    since?: number;
    until?: number;
    limit?: number;
    offset?: number;
  }): Evidence[] {
    const key = params.organizationId ?? 'global';
    let results = this.chains.get(key) ?? [];

    if (params.type) {
      results = results.filter((e) => e.type === params.type);
    }
    if (params.pluginId) {
      results = results.filter((e) => e.pluginId === params.pluginId);
    }
    if (params.ruleId) {
      results = results.filter((e) => e.ruleId === params.ruleId);
    }
    if (params.requestId) {
      results = results.filter((e) => e.requestId === params.requestId);
    }
    if (params.since) {
      results = results.filter((e) => e.timestamp >= params.since!);
    }
    if (params.until) {
      results = results.filter((e) => e.timestamp <= params.until!);
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  // ---- Stats ----

  stats(organizationId?: string) {
    const key = organizationId ?? 'global';
    const entries = this.chains.get(key) ?? [];

    const byType = {} as Record<EvidenceType, number>;
    for (const e of entries) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
    }

    return {
      total: entries.length,
      byType,
      chainValid: this.getChain(organizationId).valid,
      oldestEntry: entries.length > 0 ? entries[0].timestamp : undefined,
      newestEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : undefined,
    };
  }

  // ---- Bulk Operations ----

  clear(organizationId?: string): void {
    if (organizationId) {
      this.chains.delete(organizationId);
    } else {
      this.chains.clear();
    }
  }

  count(organizationId?: string): number {
    const key = organizationId ?? 'global';
    return (this.chains.get(key) ?? []).length;
  }
}
