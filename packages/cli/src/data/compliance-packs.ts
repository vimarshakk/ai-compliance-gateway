export interface CompliancePack {
  id: string;
  name: string;
  description: string;
  region: string;
  industry: string;
  version: string;
  rules: number;
  requiredControls: string[];
  frameworks: string[];
}

export const compliancePacks: CompliancePack[] = [
  {
    id: 'hipaa',
    name: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act — US healthcare data protection',
    region: 'us',
    industry: 'Healthcare',
    version: '1.0.0',
    rules: 24,
    requiredControls: ['encryption-at-rest', 'encryption-in-transit', 'audit-logging', 'access-control', 'phi-redaction'],
    frameworks: ['HIPAA', 'HITECH'],
  },
  {
    id: 'dpdp',
    name: 'DPDP',
    description: 'Digital Personal Data Protection Act — India data privacy',
    region: 'in',
    industry: 'All',
    version: '1.0.0',
    rules: 18,
    requiredControls: ['consent-management', 'data-minimization', 'purpose-limitation', 'cross-border-restriction', 'data-deletion'],
    frameworks: ['DPDP-2023'],
  },
  {
    id: 'pci-dss',
    name: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard',
    region: 'global',
    industry: 'Financial Services',
    version: '4.0.1',
    rules: 32,
    requiredControls: ['card-data-masking', 'encryption', 'access-control', 'audit-logging', 'vulnerability-management'],
    frameworks: ['PCI-DSS-4.0'],
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    description: 'General Data Protection Regulation — EU data privacy',
    region: 'eu',
    industry: 'All',
    version: '1.0.0',
    rules: 28,
    requiredControls: ['consent-management', 'data-minimization', 'right-to-erasure', 'data-portability', 'breach-notification'],
    frameworks: ['GDPR'],
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    description: 'Service Organization Control Type 2 — Trust service criteria',
    region: 'global',
    industry: 'Technology',
    version: '2017',
    rules: 42,
    requiredControls: ['access-control', 'encryption', 'audit-logging', 'monitoring', 'incident-response'],
    frameworks: ['SOC2-TSC'],
  },
  {
    id: 'abdm',
    name: 'ABDM',
    description: 'Ayushman Bharat Digital Mission — India health data exchange',
    region: 'in',
    industry: 'Healthcare',
    version: '1.0.0',
    rules: 16,
    requiredControls: ['abha-verification', 'consent-artifact', 'health-record-sharing', 'fhir-compatibility'],
    frameworks: ['ABDM', 'FHIR-R4'],
  },
  {
    id: 'ai-safety',
    name: 'AI Safety',
    description: 'AI Safety best practices — prompt injection, jailbreak, data leakage prevention',
    region: 'global',
    industry: 'All',
    version: '1.0.0',
    rules: 20,
    requiredControls: ['prompt-injection-detection', 'jailbreak-prevention', 'data-leakage-prevention', 'output-filtering', 'rate-limiting'],
    frameworks: ['NIST-AI-RMF', 'EU-AI-Act'],
  },
  {
    id: 'banking',
    name: 'Banking Compliance',
    description: 'RBI/Banking regulatory compliance for AI systems in financial services',
    region: 'in',
    industry: 'Financial Services',
    version: '1.0.0',
    rules: 22,
    requiredControls: ['data-localization', 'audit-logging', 'access-control', 'fraud-detection', 'transaction-monitoring'],
    frameworks: ['RBI-Guidelines', 'PCI-DSS-4.0'],
  },
];
