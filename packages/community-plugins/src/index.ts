/**
 * @acg/community-plugins
 *
 * Community plugin system — manifest format, validation, discovery, and sandbox execution.
 */

// ─── Types ──────────────────────────────────────────────

export type PluginType = 'engine' | 'rule-pack' | 'connector' | 'dashboard' | 'middleware' | 'notifier';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  type: PluginType;
  minAcgVersion: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  permissions: PluginPermission[];
  entry: string; // relative path to entry point
  config?: PluginConfigSchema;
}

export interface PluginPermission {
  type: 'network' | 'filesystem' | 'database' | 'env' | 'exec';
  description: string;
  required: boolean;
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    default?: unknown;
    required?: boolean;
  }>;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 quality score
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  installedAt: Date;
  enabled: boolean;
  sandbox: SandboxConfig;
  config?: Record<string, unknown>;
  lastRun?: Date;
  runCount: number;
}

export interface SandboxConfig {
  maxMemoryMB: number;
  maxCpuPercent: number;
  timeoutMs: number;
  allowedDomains: string[];
  readOnly: boolean;
  networkAccess: boolean;
}

// ─── Plugin Registry ────────────────────────────────────

export class PluginRegistry {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();

  constructor() {
    this.seedCommunityPlugins();
  }

  private seedCommunityPlugins(): void {
    const communityPlugins: PluginManifest[] = [
      {
        name: 'acg-slack-notifier',
        version: '1.0.0',
        description: 'Send compliance alerts to Slack channels',
        author: 'community',
        license: 'MIT',
        type: 'notifier',
        minAcgVersion: '0.1.0',
        keywords: ['slack', 'notifications', 'alerts'],
        permissions: [{ type: 'network', description: 'Send messages to Slack webhook', required: true }],
        entry: 'dist/index.js',
        config: {
          type: 'object',
          properties: {
            webhookUrl: { type: 'string', description: 'Slack webhook URL', required: true },
            channel: { type: 'string', description: 'Channel name', default: '#compliance' },
          },
        },
      },
      {
        name: 'acg-github-checks',
        version: '1.0.0',
        description: 'Create GitHub check runs for compliance results',
        author: 'community',
        license: 'MIT',
        type: 'connector',
        minAcgVersion: '0.1.0',
        keywords: ['github', 'checks', 'ci-cd'],
        permissions: [
          { type: 'network', description: 'Access GitHub API', required: true },
          { type: 'env', description: 'GITHUB_TOKEN environment variable', required: true },
        ],
        entry: 'dist/index.js',
      },
      {
        name: 'acg-s3-evidence-store',
        version: '1.0.0',
        description: 'Store compliance evidence in AWS S3 with versioning',
        author: 'community',
        license: 'MIT',
        type: 'connector',
        minAcgVersion: '0.1.0',
        keywords: ['aws', 's3', 'evidence', 'storage'],
        permissions: [
          { type: 'network', description: 'Access AWS S3 API', required: true },
          { type: 'env', description: 'AWS credentials', required: true },
        ],
        entry: 'dist/index.js',
        config: {
          type: 'object',
          properties: {
            bucket: { type: 'string', description: 'S3 bucket name', required: true },
            prefix: { type: 'string', description: 'Key prefix', default: 'compliance-evidence/' },
          },
        },
      },
      {
        name: 'acg-telecom-rules',
        version: '1.0.0',
        description: 'Indian Telecom Regulatory Authority (TRAI) compliance rules',
        author: 'community',
        license: 'MIT',
        type: 'rule-pack',
        minAcgVersion: '0.1.0',
        keywords: ['india', 'telecom', 'trai'],
        permissions: [],
        entry: 'dist/index.js',
      },
      {
        name: 'acg-pharma-rules',
        version: '1.0.0',
        description: 'CDSCO pharmaceutical compliance rules for AI in drug discovery',
        author: 'community',
        license: 'MIT',
        type: 'rule-pack',
        minAcgVersion: '0.1.0',
        keywords: ['india', 'pharma', 'cdsco', 'drug-discovery'],
        permissions: [],
        entry: 'dist/index.js',
      },
      {
        name: 'acg-custom-dashboard-widget',
        version: '1.0.0',
        description: 'Custom dashboard widget for compliance score visualization',
        author: 'community',
        license: 'MIT',
        type: 'dashboard',
        minAcgVersion: '0.1.0',
        keywords: ['dashboard', 'widget', 'visualization'],
        permissions: [{ type: 'filesystem', description: 'Read dashboard templates', required: false }],
        entry: 'dist/index.js',
      },
    ];

    for (const manifest of communityPlugins) {
      this.manifests.set(manifest.name, manifest);
    }
  }

  /** Validate a plugin manifest */
  validate(manifest: PluginManifest): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Required fields
    if (!manifest.name) { errors.push('Missing required field: name'); score -= 20; }
    if (!manifest.version) { errors.push('Missing required field: version'); score -= 15; }
    if (!manifest.description) { errors.push('Missing required field: description'); score -= 10; }
    if (!manifest.author) { errors.push('Missing required field: author'); score -= 10; }
    if (!manifest.type) { errors.push('Missing required field: type'); score -= 15; }
    if (!manifest.minAcgVersion) { errors.push('Missing required field: minAcgVersion'); score -= 10; }
    if (!manifest.entry) { errors.push('Missing required field: entry'); score -= 15; }

    // Version format
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Version must follow semver format (X.Y.Z)');
      score -= 10;
    }

    // Type validation
    const validTypes: PluginType[] = ['engine', 'rule-pack', 'connector', 'dashboard', 'middleware', 'notifier'];
    if (manifest.type && !validTypes.includes(manifest.type)) {
      errors.push(`Invalid type: ${manifest.type}. Must be one of: ${validTypes.join(', ')}`);
      score -= 10;
    }

    // Permissions
    if (manifest.permissions) {
      const dangerousPerms = manifest.permissions.filter((p) => p.type === 'exec' || p.type === 'filesystem');
      if (dangerousPerms.length > 0) {
        warnings.push(`Plugin requests dangerous permissions: ${dangerousPerms.map((p) => p.type).join(', ')}`);
        score -= 5;
      }

      const requiredPerms = manifest.permissions.filter((p) => p.required);
      if (requiredPerms.length > 3) {
        warnings.push('Plugin requires many permissions — consider reducing scope');
        score -= 5;
      }
    }

    // Warnings
    if (!manifest.homepage) warnings.push('No homepage specified');
    if (!manifest.repository) warnings.push('No repository specified');
    if (!manifest.keywords || manifest.keywords.length === 0) warnings.push('No keywords specified');
    if (!manifest.license) warnings.push('No license specified');
    if (!manifest.config) warnings.push('No configuration schema defined');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /** Create default sandbox config for a plugin type */
  getDefaultSandbox(type: PluginType): SandboxConfig {
    const defaults: Record<PluginType, SandboxConfig> = {
      engine: { maxMemoryMB: 256, maxCpuPercent: 50, timeoutMs: 30000, allowedDomains: [], readOnly: false, networkAccess: false },
      'rule-pack': { maxMemoryMB: 128, maxCpuPercent: 25, timeoutMs: 10000, allowedDomains: [], readOnly: true, networkAccess: false },
      connector: { maxMemoryMB: 512, maxCpuPercent: 50, timeoutMs: 60000, allowedDomains: [], readOnly: false, networkAccess: true },
      dashboard: { maxMemoryMB: 64, maxCpuPercent: 10, timeoutMs: 5000, allowedDomains: [], readOnly: true, networkAccess: false },
      middleware: { maxMemoryMB: 256, maxCpuPercent: 30, timeoutMs: 15000, allowedDomains: [], readOnly: false, networkAccess: false },
      notifier: { maxMemoryMB: 128, maxCpuPercent: 20, timeoutMs: 10000, allowedDomains: [], readOnly: false, networkAccess: true },
    };
    return defaults[type];
  }

  /** Install a plugin with sandbox */
  install(manifest: PluginManifest, config?: Record<string, unknown>): InstalledPlugin {
    const validation = this.validate(manifest);
    if (!validation.valid) {
      throw new Error(`Plugin validation failed: ${validation.errors.join('; ')}`);
    }

    const plugin: InstalledPlugin = {
      manifest,
      installedAt: new Date(),
      enabled: true,
      sandbox: this.getDefaultSandbox(manifest.type),
      config,
      runCount: 0,
    };

    this.plugins.set(manifest.name, plugin);
    return plugin;
  }

  /** Uninstall a plugin */
  uninstall(name: string): boolean {
    return this.plugins.delete(name);
  }

  /** Check if a plugin is installed */
  isInstalled(name: string): boolean {
    return this.plugins.has(name);
  }

  /** List installed plugins */
  listInstalled(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** List available community plugins */
  listAvailable(): PluginManifest[] {
    return Array.from(this.manifests.values());
  }

  /** Search available plugins */
  search(query: string): PluginManifest[] {
    const q = query.toLowerCase();
    return this.listAvailable().filter(
      (p) =>
        p.name.includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.keywords ?? []).some((k) => k.includes(q))
    );
  }

  /** Get a specific plugin */
  get(name: string): InstalledPlugin | undefined {
    return this.plugins.get(name);
  }

  /** Toggle plugin enabled state */
  toggle(name: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.enabled = enabled;
    return true;
  }

  /** Record a plugin run */
  recordRun(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.lastRun = new Date();
      plugin.runCount++;
    }
  }
}
