/**
 * @acg/marketplace
 *
 * Policy pack marketplace — install, publish, version, and manage compliance packs.
 */

// ─── Types ──────────────────────────────────────────────

export interface PackManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  compliance: ComplianceMapping[];
  dependencies?: string[];
  minCliVersion?: string;
  rules: PackRule[];
  config?: Record<string, unknown>;
}

export interface ComplianceMapping {
  framework: string; // e.g. "HIPAA", "GDPR", "DPDP"
  section: string;   // e.g. "§164.530"
  description: string;
}

export interface PackRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'rego' | 'javascript' | 'python' | 'yaml';
  content: string;
  tags?: string[];
}

export interface InstalledPack {
  manifest: PackManifest;
  installedAt: Date;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface PackVersion {
  version: string;
  publishedAt: Date;
  changelog: string;
  size: number; // bytes
  checksum: string; // sha256
}

export interface PackEntry {
  manifest: PackManifest;
  versions: PackVersion[];
  downloads: number;
  rating: number; // 0-5
  verified: boolean;
  publishedAt: Date;
}

export interface PublishResult {
  success: boolean;
  packId: string;
  version: string;
  message: string;
}

export interface InstallResult {
  success: boolean;
  packId: string;
  version: string;
  installedPath: string;
  message: string;
}

// ─── Pack Registry ──────────────────────────────────────

export class PackRegistry {
  private packs: Map<string, PackEntry> = new Map();
  private installed: Map<string, InstalledPack> = new Map();

  constructor() {
    this.seedBuiltinPacks();
  }

  private seedBuiltinPacks(): void {
    const builtins: PackEntry[] = [
      this.createBuiltinPack('dpdp', '0.1.0', 'India Data Protection & Digital Privacy', 'India DPDP Act 2023 compliance rules', ['india', 'privacy', 'dpdp']),
      this.createBuiltinPack('hipaa', '0.1.0', 'US Health Insurance Portability & Accountability Act', 'HIPAA compliance for healthcare AI', ['us', 'healthcare', 'hipaa']),
      this.createBuiltinPack('gdpr', '0.1.0', 'EU General Data Protection Regulation', 'GDPR compliance for EU data subjects', ['eu', 'privacy', 'gdpr']),
      this.createBuiltinPack('pci-dss', '0.1.0', 'Payment Card Industry Data Security Standard', 'PCI-DSS compliance for payment AI', ['finance', 'payments', 'pci']),
      this.createBuiltinPack('soc2', '0.1.0', 'SOC 2 Type II', 'SOC 2 compliance for SaaS AI', ['enterprise', 'soc2']),
      this.createBuiltinPack('abdm', '0.1.0', 'India Ayushman Bharat Digital Mission', 'ABDM/ABHA compliance for Indian healthcare', ['india', 'healthcare', 'abdm']),
      this.createBuiltinPack('ai-safety', '0.1.0', 'AI Safety & Responsible AI', 'AI safety rules — bias, toxicity, hallucination', ['ai', 'safety']),
      this.createBuiltinPack('banking', '0.1.0', 'Reserve Bank of India Banking Regulations', 'RBI compliance for banking AI in India', ['india', 'banking', 'rbi']),
    ];

    for (const entry of builtins) {
      this.packs.set(entry.manifest.name, entry);
    }
  }

  private createBuiltinPack(name: string, version: string, description: string, fullDesc: string, tags: string[]): PackEntry {
    return {
      manifest: {
        name,
        version,
        description: fullDesc,
        author: 'ACG Team',
        license: 'MIT',
        tags,
        compliance: [{ framework: name.toUpperCase(), section: 'all', description }],
        rules: [],
      },
      versions: [{ version, publishedAt: new Date(), changelog: 'Initial release', size: 1024, checksum: '' }],
      downloads: 0,
      rating: 4.5,
      verified: true,
      publishedAt: new Date(),
    };
  }

  /** List all available packs */
  list(): PackEntry[] {
    return Array.from(this.packs.values());
  }

  /** Get a specific pack */
  get(name: string): PackEntry | undefined {
    return this.packs.get(name);
  }

  /** Search packs by query */
  search(query: string): PackEntry[] {
    const q = query.toLowerCase();
    return this.list().filter(
      (p) =>
        p.manifest.name.includes(q) ||
        p.manifest.description.toLowerCase().includes(q) ||
        p.manifest.tags.some((t) => t.includes(q))
    );
  }

  /** Install a pack */
  install(name: string, config?: Record<string, unknown>): InstallResult {
    const entry = this.packs.get(name);
    if (!entry) {
      return { success: false, packId: name, version: '', installedPath: '', message: `Pack "${name}" not found` };
    }

    const installedPack: InstalledPack = {
      manifest: entry.manifest,
      installedAt: new Date(),
      enabled: true,
      config,
    };

    this.installed.set(name, installedPack);
    entry.downloads++;

    return {
      success: true,
      packId: name,
      version: entry.manifest.version,
      installedPath: `packs/${name}`,
      message: `Installed ${name}@${entry.manifest.version}`,
    };
  }

  /** Uninstall a pack */
  uninstall(name: string): boolean {
    return this.installed.delete(name);
  }

  /** Check if a pack is installed */
  isInstalled(name: string): boolean {
    return this.installed.has(name);
  }

  /** List installed packs */
  listInstalled(): InstalledPack[] {
    return Array.from(this.installed.values());
  }

  /** Enable/disable an installed pack */
  toggle(name: string, enabled: boolean): boolean {
    const pack = this.installed.get(name);
    if (!pack) return false;
    pack.enabled = enabled;
    return true;
  }

  /** Publish a pack (simulated — would POST to registry) */
  publish(manifest: PackManifest): PublishResult {
    const existing = this.packs.get(manifest.name);
    if (existing) {
      const latestVersion = existing.versions[existing.versions.length - 1];
      if (latestVersion.version === manifest.version) {
        return { success: false, packId: manifest.name, version: manifest.version, message: `Version ${manifest.version} already published` };
      }
      existing.versions.push({
        version: manifest.version,
        publishedAt: new Date(),
        changelog: `Update to ${manifest.version}`,
        size: JSON.stringify(manifest).length,
        checksum: '',
      });
      existing.manifest = manifest;
    } else {
      this.packs.set(manifest.name, {
        manifest,
        versions: [{ version: manifest.version, publishedAt: new Date(), changelog: 'Initial release', size: JSON.stringify(manifest).length, checksum: '' }],
        downloads: 0,
        rating: 0,
        verified: false,
        publishedAt: new Date(),
      });
    }

    return { success: true, packId: manifest.name, version: manifest.version, message: `Published ${manifest.name}@${manifest.version}` };
  }

  /** Get all compliance frameworks covered by installed packs */
  getComplianceFrameworks(): string[] {
    const frameworks = new Set<string>();
    for (const pack of this.installed.values()) {
      for (const c of pack.manifest.compliance) {
        frameworks.add(c.framework);
      }
    }
    return Array.from(frameworks);
  }
}
