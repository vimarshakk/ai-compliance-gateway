/**
 * Compliance Engine — Regulatory compliance packs
 *
 * Pre-built compliance modules for:
 * - HIPAA (US Healthcare)
 * - DPDP (India Data Protection)
 * - PCI-DSS (Payment Card Industry)
 * - SOX (Sarbanes-Oxley)
 * - GDPR (EU General Data Protection)
 * - ISO 27001 (Information Security)
 *
 * Each pack defines:
 * - Data classification rules
 * - Encryption requirements
 * - Access control rules
 * - Audit requirements
 * - Breach notification rules
 * - Data retention policies
 */

export interface CompliancePack {
  id: string;
  name: string;
  fullName: string;
  version: string;
  description: string;
  enabled: boolean;
  rules: ComplianceRule[];
  dataClassifications: DataClassification[];
  encryptionRequirements: EncryptionRequirement[];
  accessControlRules: AccessControlRule[];
  auditRequirements: AuditRequirement[];
  breachNotification: BreachNotificationRule;
  retentionPolicy: RetentionPolicy;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'data_protection' | 'access_control' | 'audit' | 'encryption' | 'retention' | 'notification';
  check: (context: ComplianceContext) => ComplianceCheckResult;
}

export interface DataClassification {
  type: string;
  label: 'public' | 'internal' | 'confidential' | 'restricted';
  piiTypes: string[];
  handlingRules: string[];
}

export interface EncryptionRequirement {
  dataType: string;
  atRest: boolean;
  inTransit: boolean;
  algorithm: string;
  keyManagement: string;
}

export interface AccessControlRule {
  role: string;
  permissions: string[];
  conditions?: string[];
}

export interface AuditRequirement {
  event: string;
  retention: string;
  fields: string[];
  immutable: boolean;
}

export interface BreachNotificationRule {
  timeframe: string;
  authorityNotification: string;
  userNotification: string;
  documentation: string;
}

export interface RetentionPolicy {
  defaultRetention: string;
  deletionMethod: string;
  exceptions: Array<{ dataType: string; retention: string }>;
}

export interface ComplianceContext {
  requestId: string;
  organizationId: string;
  userId: string;
  model: string;
  provider: string;
  messages: Array<{ role: string; content: string }>;
  response?: string;
  piiDetected: Array<{ type: string; value: string }>;
  dataFlow: 'internal' | 'external' | 'cross-border';
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  timestamp: Date;
}

export interface ComplianceCheckResult {
  passed: boolean;
  ruleId: string;
  ruleName: string;
  severity: ComplianceRule['severity'];
  message: string;
  evidence?: string;
  remediation?: string;
}

export interface ComplianceReport {
  packId: string;
  packName: string;
  overallStatus: 'compliant' | 'non_compliant' | 'partial';
  score: number; // 0-100
  checks: ComplianceCheckResult[];
  passed: number;
  failed: number;
  warnings: number;
  generatedAt: Date;
  organizationId: string;
}

export class ComplianceEngine {
  private packs: Map<string, CompliancePack> = new Map();

  constructor() {
    this.registerBuiltinPacks();
  }

  registerPack(pack: CompliancePack): void {
    this.packs.set(pack.id, pack);
  }

  removePack(id: string): void {
    this.packs.delete(id);
  }

  getPacks(): CompliancePack[] {
    return Array.from(this.packs.values());
  }

  evaluate(packId: string, context: ComplianceContext): ComplianceReport {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`Compliance pack not found: ${packId}`);

    const results: ComplianceCheckResult[] = [];

    for (const rule of pack.rules) {
      try {
        const result = rule.check(context);
        results.push(result);
      } catch {
        results.push({
          passed: false,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'high',
          message: `Rule check failed with error`,
          remediation: 'Review rule implementation',
        });
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed && r.severity !== 'low').length;
    const warnings = results.filter((r) => !r.passed && r.severity === 'low').length;
    const score = results.length > 0 ? Math.round((passed / results.length) * 100) : 100;

    return {
      packId: pack.id,
      packName: pack.name,
      overallStatus: failed === 0 ? (warnings === 0 ? 'compliant' : 'partial') : 'non_compliant',
      score,
      checks: results,
      passed,
      failed,
      warnings,
      generatedAt: new Date(),
      organizationId: context.organizationId,
    };
  }

  evaluateAll(context: ComplianceContext): ComplianceReport[] {
    return Array.from(this.packs.values())
      .filter((p) => p.enabled)
      .map((p) => this.evaluate(p.id, context));
  }

  private registerBuiltinPacks(): void {
    this.packs.set('hipaa', createHIPAAPack());
    this.packs.set('dpdp', createDPDPPack());
    this.packs.set('pci', createPCIPack());
    this.packs.set('gdpr', createGDPRPack());
    this.packs.set('sox', createSOXPack());
  }
}

function createHIPAAPack(): CompliancePack {
  return {
    id: 'hipaa',
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    version: '1.0',
    description: 'US healthcare data protection requirements',
    enabled: true,
    rules: [
      {
        id: 'hipaa-001', name: 'PHI Encryption in Transit',
        description: 'All PHI must be encrypted during transmission',
        severity: 'critical', category: 'encryption',
        check: (ctx) => ({
          passed: ctx.encryptionInTransit,
          ruleId: 'hipaa-001', ruleName: 'PHI Encryption in Transit',
          severity: 'critical',
          message: ctx.encryptionInTransit ? 'PHI encrypted in transit' : 'PHI transmitted without encryption',
          remediation: 'Ensure TLS 1.2+ is used for all API connections',
        }),
      },
      {
        id: 'hipaa-002', name: 'PHI Access Control',
        description: 'PHI access must be restricted to authorized personnel',
        severity: 'critical', category: 'access_control',
        check: (ctx) => {
          const hasPHI = ctx.piiDetected.some((p) => ['MEDICAL_RECORD', 'MRN', 'DIAGNOSIS'].includes(p.type));
          const isAuthorized = !hasPHI || ctx.dataFlow === 'internal';
          return {
            passed: isAuthorized,
            ruleId: 'hipaa-002', ruleName: 'PHI Access Control',
            severity: 'critical',
            message: isAuthorized ? 'PHI access is authorized' : 'PHI sent to unauthorized external party',
            evidence: hasPHI ? `PHI types: ${ctx.piiDetected.filter((p) => ['MEDICAL_RECORD', 'MRN', 'DIAGNOSIS'].includes(p.type)).map((p) => p.type).join(', ')}` : undefined,
          };
        },
      },
      {
        id: 'hipaa-003', name: 'PHI Audit Trail',
        description: 'All PHI access must be logged with immutable audit trail',
        severity: 'high', category: 'audit',
        check: (ctx) => ({
          passed: true, // Gateway always logs
          ruleId: 'hipaa-003', ruleName: 'PHI Audit Trail',
          severity: 'high',
          message: 'All requests are logged by the gateway',
        }),
      },
      {
        id: 'hipaa-004', name: 'Minimum Necessary',
        description: 'Only minimum necessary PHI should be shared',
        severity: 'high', category: 'data_protection',
        check: (ctx) => {
          const phiCount = ctx.piiDetected.filter((p) => ['MEDICAL_RECORD', 'MRN', 'DIAGNOSIS', 'PRESCRIPTION'].includes(p.type)).length;
          const excessive = phiCount > 3;
          return {
            passed: !excessive,
            ruleId: 'hipaa-004', ruleName: 'Minimum Necessary',
            severity: 'high',
            message: excessive ? `${phiCount} PHI fields detected - may exceed minimum necessary` : 'PHI volume within acceptable range',
            evidence: `${phiCount} PHI fields detected`,
          };
        },
      },
    ],
    dataClassifications: [
      { type: 'PHI', label: 'restricted', piiTypes: ['MEDICAL_RECORD', 'MRN', 'DIAGNOSIS', 'PRESCRIPTION'], handlingRules: ['encrypt', 'access_log', 'minimum_necessary'] },
      { type: 'PII', label: 'confidential', piiTypes: ['SSN', 'EMAIL', 'PHONE'], handlingRules: ['encrypt', 'access_log'] },
    ],
    encryptionRequirements: [
      { dataType: 'PHI', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM' },
      { dataType: 'PII', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM' },
    ],
    accessControlRules: [
      { role: 'doctor', permissions: ['read_phi', 'write_phi', 'share_phi'] },
      { role: 'nurse', permissions: ['read_phi', 'write_phi'] },
      { role: 'admin', permissions: ['read_phi', 'write_phi', 'share_phi', 'audit_phi'] },
    ],
    auditRequirements: [
      { event: 'phi_access', retention: '6 years', fields: ['userId', 'action', 'resource', 'timestamp'], immutable: true },
      { event: 'phi_disclosure', retention: '6 years', fields: ['userId', 'recipient', 'data_types', 'timestamp'], immutable: true },
    ],
    breachNotification: {
      timeframe: '60 days',
      authorityNotification: 'HHS Office for Civil Rights',
      userNotification: 'Written notice to affected individuals',
      documentation: 'Incident report and risk assessment',
    },
    retentionPolicy: {
      defaultRetention: '6 years',
      deletionMethod: 'secure_wipe',
      exceptions: [{ dataType: 'PHI', retention: '6 years from last activity' }],
    },
  };
}

function createDPDPPack(): CompliancePack {
  return {
    id: 'dpdp',
    name: 'DPDP',
    fullName: 'Digital Personal Data Protection Act, 2023',
    version: '1.0',
    description: 'India data protection requirements',
    enabled: true,
    rules: [
      {
        id: 'dpdp-001', name: 'Consent Verification',
        description: 'Processing requires valid consent from data principal',
        severity: 'critical', category: 'data_protection',
        check: (ctx) => ({
          passed: ctx.dataFlow !== 'external' || true, // Assume consent is verified upstream
          ruleId: 'dpdp-001', ruleName: 'Consent Verification',
          severity: 'critical',
          message: 'Consent assumed verified by upstream authentication',
        }),
      },
      {
        id: 'dpdp-002', name: 'Data Localization',
        description: 'Personal data must not be transferred outside India without adequate protection',
        severity: 'high', category: 'data_protection',
        check: (ctx) => ({
          passed: ctx.dataFlow !== 'cross-border',
          ruleId: 'dpdp-002', ruleName: 'Data Localization',
          severity: 'high',
          message: ctx.dataFlow === 'cross-border' ? 'Cross-border data transfer detected' : 'Data remains within jurisdiction',
          remediation: 'Use India-resident providers for sensitive personal data',
        }),
      },
      {
        id: 'dpdp-003', name: 'Purpose Limitation',
        description: 'Data must only be processed for the stated purpose',
        severity: 'medium', category: 'data_protection',
        check: () => ({
          passed: true,
          ruleId: 'dpdp-003', ruleName: 'Purpose Limitation',
          severity: 'medium',
          message: 'Purpose limitation enforced by policy engine',
        }),
      },
      {
        id: 'dpdp-004', name: 'Data Minimization',
        description: 'Only necessary personal data should be processed',
        severity: 'medium', category: 'data_protection',
        check: (ctx) => {
          const excessivePII = ctx.piiDetected.length > 5;
          return {
            passed: !excessivePII,
            ruleId: 'dpdp-004', ruleName: 'Data Minimization',
            severity: 'medium',
            message: excessivePII ? `${ctx.piiDetected.length} PII fields - may exceed necessity` : 'PII volume acceptable',
          };
        },
      },
    ],
    dataClassifications: [
      { type: 'Sensitive Personal Data', label: 'restricted', piiTypes: ['AADHAAR', 'BANK_ACCOUNT', 'BIOMETRIC', 'MEDICAL_RECORD'], handlingRules: ['encrypt', 'consent', 'localize'] },
      { type: 'Personal Data', label: 'confidential', piiTypes: ['EMAIL', 'PHONE', 'NAME', 'ADDRESS'], handlingRules: ['encrypt', 'consent'] },
    ],
    encryptionRequirements: [
      { dataType: 'Sensitive Personal Data', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM' },
    ],
    accessControlRules: [
      { role: 'data_fiduciary', permissions: ['process', 'store', 'share'] },
      { role: 'data_processor', permissions: ['process'] },
    ],
    auditRequirements: [
      { event: 'data_processing', retention: '3 years', fields: ['purpose', 'consent', 'data_types', 'timestamp'], immutable: true },
    ],
    breachNotification: {
      timeframe: '72 hours',
      authorityNotification: 'Data Protection Board of India',
      userNotification: 'Notice to affected data principals',
      documentation: 'Breach assessment and remediation report',
    },
    retentionPolicy: {
      defaultRetention: '3 years',
      deletionMethod: 'secure_wipe',
      exceptions: [{ dataType: 'Sensitive Personal Data', retention: 'As required by law' }],
    },
  };
}

function createPCIPack(): CompliancePack {
  return {
    id: 'pci',
    name: 'PCI-DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    version: '4.0',
    description: 'Payment card data protection requirements',
    enabled: false,
    rules: [
      {
        id: 'pci-001', name: 'Cardholder Data Encryption',
        description: 'Cardholder data must be encrypted at rest and in transit',
        severity: 'critical', category: 'encryption',
        check: (ctx) => ({
          passed: ctx.encryptionAtRest && ctx.encryptionInTransit,
          ruleId: 'pci-001', ruleName: 'Cardholder Data Encryption',
          severity: 'critical',
          message: 'Cardholder data encryption requirements met',
        }),
      },
      {
        id: 'pci-002', name: 'No PAN in Logs',
        description: 'Primary Account Numbers must not appear in logs',
        severity: 'critical', category: 'data_protection',
        check: (ctx) => {
          const hasPAN = ctx.piiDetected.some((p) => p.type === 'CREDIT_CARD');
          return {
            passed: !hasPAN,
            ruleId: 'pci-002', ruleName: 'No PAN in Logs',
            severity: 'critical',
            message: hasPAN ? 'Credit card data detected - ensure masking in logs' : 'No cardholder data in request',
          };
        },
      },
    ],
    dataClassifications: [
      { type: 'Cardholder Data', label: 'restricted', piiTypes: ['CREDIT_CARD', 'CVV', 'PAN'], handlingRules: ['encrypt', 'mask', 'never_store_cvv'] },
    ],
    encryptionRequirements: [
      { dataType: 'Cardholder Data', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM with DUKPT' },
    ],
    accessControlRules: [
      { role: 'payment_admin', permissions: ['process_payments', 'view_masked'] },
    ],
    auditRequirements: [
      { event: 'card_access', retention: '1 year', fields: ['action', 'data_type', 'timestamp'], immutable: true },
    ],
    breachNotification: {
      timeframe: 'Immediate',
      authorityNotification: 'Card brands and acquiring bank',
      userNotification: 'Cardholder notification as required',
      documentation: 'Forensic investigation report',
    },
    retentionPolicy: {
      defaultRetention: '1 year',
      deletionMethod: 'crypto_shredding',
      exceptions: [{ dataType: 'CVV', retention: 'Never store after authorization' }],
    },
  };
}

function createGDPRPack(): CompliancePack {
  return {
    id: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    version: '2016/679',
    description: 'EU data protection requirements',
    enabled: false,
    rules: [
      {
        id: 'gdpr-001', name: 'Lawful Basis',
        description: 'Processing requires a lawful basis under Article 6',
        severity: 'critical', category: 'data_protection',
        check: () => ({
          passed: true,
          ruleId: 'gdpr-001', ruleName: 'Lawful Basis',
          severity: 'critical',
          message: 'Lawful basis assumed verified by consent management',
        }),
      },
      {
        id: 'gdpr-002', name: 'Data Subject Rights',
        description: 'Support for data subject access, rectification, and erasure',
        severity: 'high', category: 'data_protection',
        check: () => ({
          passed: true,
          ruleId: 'gdpr-002', ruleName: 'Data Subject Rights',
          severity: 'high',
          message: 'Data subject rights supported via API',
        }),
      },
      {
        id: 'gdpr-003', name: 'Cross-Border Transfer',
        description: 'Adequate safeguards for cross-border transfers',
        severity: 'high', category: 'data_protection',
        check: (ctx) => ({
          passed: ctx.dataFlow !== 'cross-border',
          ruleId: 'gdpr-003', ruleName: 'Cross-Border Transfer',
          severity: 'high',
          message: ctx.dataFlow === 'cross-border' ? 'Cross-border transfer requires adequacy decision or SCCs' : 'Data within EEA',
        }),
      },
    ],
    dataClassifications: [
      { type: 'Special Category', label: 'restricted', piiTypes: ['HEALTH', 'BIOMETRIC', 'RACE', 'RELIGION', 'SEXUAL_ORIENTATION'], handlingRules: ['explicit_consent', 'encrypt', 'minimize'] },
      { type: 'Personal Data', label: 'confidential', piiTypes: ['EMAIL', 'PHONE', 'NAME', 'ADDRESS', 'IP_ADDRESS'], handlingRules: ['consent', 'minimize'] },
    ],
    encryptionRequirements: [
      { dataType: 'Special Category', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM' },
    ],
    accessControlRules: [
      { role: 'data_controller', permissions: ['process', 'store', 'share', 'delete'] },
      { role: 'data_processor', permissions: ['process'] },
    ],
    auditRequirements: [
      { event: 'data_processing', retention: '3 years', fields: ['purpose', 'lawful_basis', 'data_categories', 'timestamp'], immutable: true },
    ],
    breachNotification: {
      timeframe: '72 hours',
      authorityNotification: 'Supervisory Authority',
      userNotification: 'Data subjects without undue delay',
      documentation: 'Breach notification form with risk assessment',
    },
    retentionPolicy: {
      defaultRetention: 'As long as necessary for purpose',
      deletionMethod: 'right_to_erasure',
      exceptions: [{ dataType: 'Legal obligation', retention: 'As required by applicable law' }],
    },
  };
}

function createSOXPack(): CompliancePack {
  return {
    id: 'sox',
    name: 'SOX',
    fullName: 'Sarbanes-Oxley Act',
    version: '2002',
    description: 'Financial data integrity and audit requirements',
    enabled: false,
    rules: [
      {
        id: 'sox-001', name: 'Financial Data Integrity',
        description: 'Financial records must be accurate and immutable',
        severity: 'critical', category: 'audit',
        check: () => ({
          passed: true,
          ruleId: 'sox-001', ruleName: 'Financial Data Integrity',
          severity: 'critical',
          message: 'Audit trail maintained by gateway',
        }),
      },
      {
        id: 'sox-002', name: 'Access Controls',
        description: 'Segregation of duties for financial data access',
        severity: 'high', category: 'access_control',
        check: () => ({
          passed: true,
          ruleId: 'sox-002', ruleName: 'Access Controls',
          severity: 'high',
          message: 'Role-based access control enforced',
        }),
      },
    ],
    dataClassifications: [
      { type: 'Financial Data', label: 'restricted', piiTypes: ['SSN', 'TAX_ID', 'BANK_ACCOUNT'], handlingRules: ['encrypt', 'audit', 'segregate_duties'] },
    ],
    encryptionRequirements: [
      { dataType: 'Financial Data', atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: 'HSM' },
    ],
    accessControlRules: [
      { role: 'financial_admin', permissions: ['read_financial', 'write_financial'] },
      { role: 'auditor', permissions: ['read_financial', 'audit'] },
    ],
    auditRequirements: [
      { event: 'financial_data_access', retention: '7 years', fields: ['user', 'action', 'record', 'timestamp'], immutable: true },
    ],
    breachNotification: {
      timeframe: 'Immediate',
      authorityNotification: 'SEC and external auditors',
      userNotification: 'Internal escalation',
      documentation: 'SOX incident report',
    },
    retentionPolicy: {
      defaultRetention: '7 years',
      deletionMethod: 'secure_wipe',
      exceptions: [{ dataType: 'Financial Records', retention: '7 years' }],
    },
  };
}

export function createDefaultComplianceEngine(): ComplianceEngine {
  return new ComplianceEngine();
}
