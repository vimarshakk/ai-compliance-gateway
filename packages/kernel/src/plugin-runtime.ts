// ============================================================
// @acg/kernel — Plugin Runtime
// ============================================================
// Dynamic plugin loader with lifecycle management.
// Plugins register rules, policies, evidence generators,
// and risk calculators. The runtime manages their lifecycle.
// ============================================================

import type {
  Plugin,
  PluginContext,
  PluginMetadata,
  PluginLifecycleHook,
  Rule,
  Policy,
  EvidenceGenerator,
  RiskCalculator,
  KernelEvent,
  KernelEventHandler,
} from './types.js';

export interface PluginRuntimeOptions {
  maxPlugins?: number;
  enableLifecycleHooks?: boolean;
}

interface PluginEntry {
  plugin: Plugin;
  status: 'loaded' | 'active' | 'inactive' | 'error';
  loadedAt: number;
  activatedAt?: number;
  error?: string;
}

export class PluginRuntime {
  private plugins = new Map<string, PluginEntry>();
  private hooks = new Map<PluginLifecycleHook, KernelEventHandler[]>();
  private options: Required<PluginRuntimeOptions>;

  constructor(options: PluginRuntimeOptions = {}) {
    this.options = {
      maxPlugins: options.maxPlugins ?? 100,
      enableLifecycleHooks: options.enableLifecycleHooks ?? true,
    };
  }

  // ---- Plugin Registration ----

  async register(plugin: Plugin): Promise<void> {
    const { id } = plugin.metadata;

    if (this.plugins.has(id)) {
      throw new Error(`Plugin "${id}" is already registered`);
    }

    if (this.plugins.size >= this.options.maxPlugins) {
      throw new Error(`Maximum plugin limit (${this.options.maxPlugins}) reached`);
    }

    // Validate dependencies
    if (plugin.metadata.dependencies) {
      for (const dep of plugin.metadata.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${id}" depends on "${dep}" which is not registered`);
        }
      }
    }

    const entry: PluginEntry = {
      plugin,
      status: 'loaded',
      loadedAt: Date.now(),
    };

    this.plugins.set(id, entry);

    // Execute onLoad hook
    if (this.options.enableLifecycleHooks && plugin.onLoad) {
      const ctx = this.createContext(plugin.metadata);
      await plugin.onLoad(ctx);
    }

    await this.emit({
      type: 'plugin.loaded',
      timestamp: Date.now(),
      source: id,
      data: { pluginId: id, version: plugin.metadata.version },
    });
  }

  async unregister(id: string): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin "${id}" is not registered`);
    }

    // Deactivate first if active
    if (entry.status === 'active') {
      await this.deactivate(id);
    }

    // Execute onUnload hook
    if (this.options.enableLifecycleHooks && entry.plugin.onUnload) {
      const ctx = this.createContext(entry.plugin.metadata);
      await entry.plugin.onUnload(ctx);
    }

    this.plugins.delete(id);

    await this.emit({
      type: 'plugin.unloaded',
      timestamp: Date.now(),
      source: id,
      data: { pluginId: id },
    });
  }

  // ---- Lifecycle Management ----

  async activate(id: string, ctx?: Partial<PluginContext>): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin "${id}" is not registered`);
    }

    if (entry.status === 'active') {
      return; // Already active
    }

    const pluginCtx = {
      ...this.createContext(entry.plugin.metadata),
      ...ctx,
    };

    if (this.options.enableLifecycleHooks && entry.plugin.activate) {
      await entry.plugin.activate(pluginCtx);
    }

    entry.status = 'active';
    entry.activatedAt = Date.now();

    await this.emit({
      type: 'plugin.activated',
      timestamp: Date.now(),
      source: id,
      data: { pluginId: id },
    });
  }

  async deactivate(id: string): Promise<void> {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin "${id}" is not registered`);
    }

    if (entry.status !== 'active') {
      return; // Not active
    }

    const ctx = this.createContext(entry.plugin.metadata);

    if (this.options.enableLifecycleHooks && entry.plugin.deactivate) {
      await entry.plugin.deactivate(ctx);
    }

    entry.status = 'inactive';

    await this.emit({
      type: 'plugin.deactivated',
      timestamp: Date.now(),
      source: id,
      data: { pluginId: id },
    });
  }

  // ---- Query Methods ----

  get(id: string): Plugin | undefined {
    return this.plugins.get(id)?.plugin;
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  list(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map((e) => e.plugin.metadata);
  }

  active(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter((e) => e.status === 'active')
      .map((e) => e.plugin);
  }

  status(id: string): PluginEntry['status'] | undefined {
    return this.plugins.get(id)?.status;
  }

  // ---- Aggregate Queries ----

  getAllRules(): Rule[] {
    const rules: Rule[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.status === 'active' && entry.plugin.rules) {
        rules.push(...entry.plugin.rules);
      }
    }
    return rules;
  }

  getAllPolicies(): Policy[] {
    const policies: Policy[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.status === 'active' && entry.plugin.policies) {
        policies.push(...entry.plugin.policies);
      }
    }
    return policies;
  }

  getAllEvidenceGenerators(): EvidenceGenerator[] {
    const generators: EvidenceGenerator[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.status === 'active' && entry.plugin.evidenceGenerators) {
        generators.push(...entry.plugin.evidenceGenerators);
      }
    }
    return generators;
  }

  getAllRiskCalculators(): RiskCalculator[] {
    const calculators: RiskCalculator[] = [];
    for (const entry of this.plugins.values()) {
      if (entry.status === 'active' && entry.plugin.riskCalculators) {
        calculators.push(...entry.plugin.riskCalculators);
      }
    }
    return calculators;
  }

  // ---- Event System ----

  on(hook: PluginLifecycleHook, handler: KernelEventHandler): void {
    if (!this.hooks.has(hook)) {
      this.hooks.set(hook, []);
    }
    this.hooks.get(hook)!.push(handler);
  }

  off(hook: PluginLifecycleHook, handler: KernelEventHandler): void {
    const handlers = this.hooks.get(hook);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  private async emit(event: KernelEvent): Promise<void> {
    const hook = event.type.split('.')[1] as PluginLifecycleHook;
    const handlers = this.hooks.get(hook) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  // ---- Helpers ----

  private createContext(metadata: PluginMetadata): PluginContext {
    return {
      pluginId: metadata.id,
      timestamp: Date.now(),
      metadata: {},
    };
  }

  // ---- Stats ----

  stats() {
    const entries = Array.from(this.plugins.values());
    return {
      total: entries.length,
      active: entries.filter((e) => e.status === 'active').length,
      loaded: entries.filter((e) => e.status === 'loaded').length,
      inactive: entries.filter((e) => e.status === 'inactive').length,
      error: entries.filter((e) => e.status === 'error').length,
      rules: this.getAllRules().length,
      policies: this.getAllPolicies().length,
    };
  }
}
