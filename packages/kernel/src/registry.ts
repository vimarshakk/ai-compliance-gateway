// ============================================================
// @acg/kernel — Registry
// ============================================================
// Centralized registry for models, providers, plugins, rules,
// policies, connectors, and packs. Never hardcode lists.
// ============================================================

import type {
  RegistryType,
  RegistryEntry,
  RegistryQuery,
} from './types.js';

export class Registry {
  private entries = new Map<string, RegistryEntry>();

  // ---- CRUD ----

  register(entry: Omit<RegistryEntry, 'registeredAt' | 'updatedAt'>): RegistryEntry {
    const now = Date.now();

    if (this.entries.has(entry.id)) {
      // Update existing
      const existing = this.entries.get(entry.id)!;
      const updated: RegistryEntry = {
        ...existing,
        ...entry,
        updatedAt: now,
      };
      this.entries.set(entry.id, updated);
      return updated;
    }

    const full: RegistryEntry = {
      ...entry,
      registeredAt: now,
      updatedAt: now,
    };

    this.entries.set(entry.id, full);
    return full;
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  update(id: string, updates: Partial<RegistryEntry>): RegistryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;

    const updated: RegistryEntry = {
      ...entry,
      ...updates,
      id: entry.id, // Prevent ID change
      updatedAt: Date.now(),
    };

    this.entries.set(id, updated);
    return updated;
  }

  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  // ---- Query ----

  query(q: RegistryQuery): RegistryEntry[] {
    let results = Array.from(this.entries.values());

    if (q.type) {
      results = results.filter((e) => e.type === q.type);
    }

    if (q.name) {
      const nameLower = q.name.toLowerCase();
      results = results.filter((e) => e.name.toLowerCase().includes(nameLower));
    }

    if (q.status) {
      results = results.filter((e) => e.status === q.status);
    }

    if (q.tags && q.tags.length > 0) {
      results = results.filter((e) => {
        const entryTags = (e.metadata?.tags as string[]) ?? [];
        return q.tags!.some((t) => entryTags.includes(t));
      });
    }

    // Sort by registeredAt descending
    results.sort((a, b) => b.registeredAt - a.registeredAt);

    // Pagination
    const offset = q.offset ?? 0;
    const limit = q.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  // ---- Convenience Methods ----

  list(type?: RegistryType): RegistryEntry[] {
    return this.query({ type, status: 'active' });
  }

  count(type?: RegistryType): number {
    return this.list(type).length;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  // ---- Bulk Operations ----

  registerMany(entries: Omit<RegistryEntry, 'registeredAt' | 'updatedAt'>[]): RegistryEntry[] {
    return entries.map((e) => this.register(e));
  }

  unregisterMany(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.entries.delete(id)) count++;
    }
    return count;
  }

  // ---- Type-Specific Queries ----

  models() {
    return this.list('model');
  }

  providers() {
    return this.list('provider');
  }

  plugins() {
    return this.list('plugin');
  }

  rules() {
    return this.list('rule');
  }

  policies() {
    return this.list('policy');
  }

  connectors() {
    return this.list('connector');
  }

  packs() {
    return this.list('pack');
  }

  // ---- Stats ----

  stats() {
    const entries = Array.from(this.entries.values());
    return {
      total: entries.length,
      active: entries.filter((e) => e.status === 'active').length,
      deprecated: entries.filter((e) => e.status === 'deprecated').length,
      disabled: entries.filter((e) => e.status === 'disabled').length,
      byType: entries.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] ?? 0) + 1;
          return acc;
        },
        {} as Record<RegistryType, number>
      ),
    };
  }

  // ---- Export/Import ----

  export(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  import(entries: RegistryEntry[]): number {
    let count = 0;
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
      count++;
    }
    return count;
  }

  clear(): void {
    this.entries.clear();
  }
}
