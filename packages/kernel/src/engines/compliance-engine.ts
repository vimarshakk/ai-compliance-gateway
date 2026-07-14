// ============================================================
// @acg/kernel — Built-in Engine: Compliance Engine
// ============================================================
// Enforces compliance packs (DPDP, HIPAA, GDPR, etc.)
// against AI requests. Fail-closed by default.
// ============================================================

import type { Engine, EngineInput, EngineOutput, EngineMetadata } from '../engine-types.js';
import { ComplianceScoreEngine, type ScanSummary } from '../compliance-score.js';

// ---- Compliance Rules by Pack ----

interface ComplianceRule {
  id: string;
  pack: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (input: EngineInput) => boolean;
  message: string;
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  // DPDP Rules
  {
    id: 'dpdp-consent',
    pack: 'dpdp',
    name: 'Consent Management Required',
    severity: 'critical',
    check: (input) => {
      // Check if consent metadata is present
      const consent = input.context['dpdp_consent'];
      return consent === true;
    },
    message: 'DPDP requires explicit consent for data processing',
  },
  {
    id: 'dpdp-data-minimization',
    pack: 'dpdp',
    name: 'Data Minimization',
    severity: 'high',
    check: (input) => {
      // Check message length (basic heuristic)
      const messages = input.request.messages ?? [];
      const totalLength = messages.reduce<number>((sum: number, m: { role: string; content: string }) => sum + (m.content?.length ?? 0), 0);
      return totalLength < 10000; // Flag if > 10k chars
    },
    message: 'Large data volume detected — apply data minimization',
  },

  // HIPAA Rules
  {
    id: 'hipaa-encryption',
    pack: 'hipaa',
    name: 'Encryption Required',
    severity: 'critical',
    check: () => {
      // In production, check if connection is HTTPS
      return true; // Pass-through for now
    },
    message: 'HIPAA requires encryption for PHI',
  },
  {
    id: 'hipaa-audit',
    pack: 'hipaa',
    name: 'Audit Logging Required',
    severity: 'critical',
    check: (input) => {
      // Check if audit metadata is present
      return input.context['hipaa_audit_enabled'] !== false;
    },
    message: 'HIPAA requires audit logging for all PHI access',
  },

  // GDPR Rules
  {
    id: 'gdpr-purpose-limitation',
    pack: 'gdpr',
    name: 'Purpose Limitation',
    severity: 'high',
    check: (input) => {
      const purpose = input.context['gdpr_purpose'];
      return typeof purpose === 'string' && purpose.length > 0;
    },
    message: 'GDPR requires specified purpose for data processing',
  },
  {
    id: 'gdpr-data-subject',
    pack: 'gdpr',
    name: 'Data Subject Rights',
    severity: 'high',
    check: (input) => {
      // Check if data subject ID is present
      return typeof input.context['gdpr_data_subject_id'] === 'string';
    },
    message: 'GDPR requires data subject identification',
  },

  // AI Safety Rules
  {
    id: 'ai-safety-injection',
    pack: 'ai-safety',
    name: 'Prompt Injection Detection',
    severity: 'critical',
    check: (input) => {
      const messages = input.request.messages ?? [];
      for (const msg of messages) {
        if (typeof msg.content !== 'string') continue;
        if (/ignore previous|override instructions|system prompt/i.test(msg.content)) {
          return false;
        }
      }
      return true;
    },
    message: 'Potential prompt injection detected',
  },
  {
    id: 'ai-safety-data-leakage',
    pack: 'ai-safety',
    name: 'Data Leakage Prevention',
    severity: 'critical',
    check: (input) => {
      const messages = input.request.messages ?? [];
      for (const msg of messages) {
        if (typeof msg.content !== 'string') continue;
        // Check for PII patterns
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(msg.content)) return false; // SSN
        if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(msg.content)) return false; // Card
        if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(msg.content)) return false; // Email
      }
      return true;
    },
    message: 'Potential PII/data leakage detected in request',
  },
];

// ---- Compliance Engine ----

export class ComplianceEngine implements Engine {
  metadata: EngineMetadata = {
    id: 'acg-compliance',
    name: 'Compliance Engine',
    version: '1.0.0',
    description: 'Enforces compliance packs (DPDP, HIPAA, GDPR, etc.)',
    author: 'acg',
    scope: 'global',
    tags: ['compliance', 'dpdp', 'hipaa', 'gdpr'],
    stages: ['pre-request'],
    priority: 250,
  };

  private activePacks: string[];
  private failClosed: boolean;

  constructor(config: {
    packs?: string[];
    failClosed?: boolean;
  } = {}) {
    this.activePacks = config.packs ?? ['dpdp', 'ai-safety'];
    this.failClosed = config.failClosed ?? true;
  }

  async execute(input: EngineInput): Promise<EngineOutput> {
    const { organization } = input;

    // Combine configured packs with org's compliance packs
    const packs = [
      ...new Set([...this.activePacks, ...organization.compliancePacks]),
    ];

    const violations: NonNullable<EngineOutput['violations']> = [];
    const rulesChecked: string[] = [];

    for (const rule of COMPLIANCE_RULES) {
      if (!packs.includes(rule.pack)) continue;

      rulesChecked.push(rule.id);

      const passed = rule.check(input);
      if (!passed) {
        violations.push({
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
        });
      }
    }

    // Fail-closed: block if any critical violation
    const criticalViolations = violations.filter((v: { rule: string; severity: string; message: string }) => v.severity === 'critical');
    const allow = !this.failClosed || criticalViolations.length === 0;

    return {
      allow,
      request: allow ? input.request : undefined,
      metadata: {
        complianceApplied: true,
        activePacks: packs,
        rulesChecked: rulesChecked.length,
        rulesPassed: rulesChecked.length - violations.length,
        rulesFailed: violations.length,
      },
      violations: violations.length > 0 ? violations : undefined,
      evidence: {
        type: 'compliance',
        data: {
          packs,
          rulesChecked: rulesChecked.length,
          violations,
        },
      },
    };
  }

  validateConfig(config: Record<string, unknown>): boolean {
    if (config.packs && !Array.isArray(config.packs)) return false;
    if (config.failClosed && typeof config.failClosed !== 'boolean') return false;
    return true;
  }

  /** Get all available compliance rules */
  static getRules(): ComplianceRule[] {
    return [...COMPLIANCE_RULES];
  }

  /** Get rules for a specific pack */
  static getRulesForPack(pack: string): ComplianceRule[] {
    return COMPLIANCE_RULES.filter(r => r.pack === pack);
  }
}
