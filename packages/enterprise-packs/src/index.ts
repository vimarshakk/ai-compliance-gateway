/**
 * @acg/enterprise-packs
 *
 * Enterprise compliance pack definitions with real regulatory rule mappings.
 */

export interface PackRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'rego' | 'javascript' | 'python' | 'yaml';
  content: string;
  section: string;
  framework: string;
  tags?: string[];
}

export interface EnterprisePack {
  id: string;
  name: string;
  description: string;
  framework: string;
  version: string;
  author: string;
  rules: PackRule[];
  tags: string[];
}

// ─── HIPAA Pack ─────────────────────────────────────────

export const HIPAA_PACK: EnterprisePack = {
  id: 'hipaa',
  name: 'HIPAA Compliance',
  description: 'Health Insurance Portability and Accountability Act — PHI protection, audit trails, minimum necessary',
  framework: 'HIPAA',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['healthcare', 'phi', 'audit', 'us'],
  rules: [
    {
      id: 'hipaa-001',
      name: 'PHI Detection in Prompts',
      description: 'Block prompts containing Protected Health Information (SSN, MRN, diagnosis codes)',
      severity: 'critical',
      type: 'rego',
      section: '§164.530(c)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.prompt contains "SSN"
  msg := "PHI detected: SSN in prompt violates §164.530(c)"
}

deny contains msg if {
  input.prompt contains "MRN"
  msg := "PHI detected: MRN in prompt violates §164.530(c)"
}`,
      tags: ['phi', 'prompt-filtering'],
    },
    {
      id: 'hipaa-002',
      name: 'Audit Trail Required',
      description: 'All AI interactions with PHI must be logged with timestamp, user, and action',
      severity: 'high',
      type: 'rego',
      section: '§164.312(b)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.containsPHI == true
  not input.auditLog.userId
  msg := "Audit trail required for PHI interactions per §164.312(b)"
}`,
      tags: ['audit', 'logging'],
    },
    {
      id: 'hipaa-003',
      name: 'Minimum Necessary Standard',
      description: 'AI responses must not expose more PHI than necessary for the task',
      severity: 'high',
      type: 'rego',
      section: '§164.502(b)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  count(input.phiFields) > 3
  msg := "Minimum necessary standard violated: too many PHI fields in response per §164.502(b)"
}`,
      tags: ['minimum-necessary', 'response-filtering'],
    },
    {
      id: 'hipaa-004',
      name: 'Encryption at Rest',
      description: 'PHI must be encrypted when stored (AES-256 or equivalent)',
      severity: 'critical',
      type: 'rego',
      section: '§164.312(a)(2)(iv)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.storePHI == true
  input.encryption != "AES-256"
  msg := "PHI must be encrypted with AES-256 per §164.312(a)(2)(iv)"
}`,
      tags: ['encryption', 'storage'],
    },
    {
      id: 'hipaa-005',
      name: 'Access Control',
      description: 'PHI access must be restricted to authorized personnel with role-based access',
      severity: 'critical',
      type: 'rego',
      section: '§164.312(a)(1)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.accessPHI == true
  not input.user.role
  msg := "PHI access requires authenticated user with role per §164.312(a)(1)"
}`,
      tags: ['access-control', 'rbac'],
    },
    {
      id: 'hipaa-006',
      name: 'Data Residency — US Only',
      description: 'PHI must remain within US borders for processing and storage',
      severity: 'high',
      type: 'rego',
      section: '§164.308(a)(4)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.storePHI == true
  not input.region in ["us-east-1", "us-west-2", "us-central1"]
  msg := "PHI must be stored in US regions per §164.308(a)(4)"
}`,
      tags: ['residency', 'data-locality'],
    },
    {
      id: 'hipaa-007',
      name: 'Business Associate Agreement',
      description: 'AI providers processing PHI must have a BAA in place',
      severity: 'high',
      type: 'rego',
      section: '§164.308(b)(1)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.containsPHI == true
  input.provider.baa != true
  msg := "AI provider must have BAA for PHI processing per §164.308(b)(1)"
}`,
      tags: ['baa', 'vendor-management'],
    },
    {
      id: 'hipaa-008',
      name: 'De-identification Before AI Processing',
      description: 'PHI must be de-identified before sending to AI models',
      severity: 'critical',
      type: 'rego',
      section: '§164.514(b)',
      framework: 'HIPAA',
      content: `deny contains msg if {
  input.sendToAI == true
  input.containsPHI == true
  input.deidentified != true
  msg := "PHI must be de-identified before AI processing per §164.514(b)"
}`,
      tags: ['de-identification', 'ai-processing'],
    },
  ],
};

// ─── PCI-DSS Pack ───────────────────────────────────────

export const PCI_DSS_PACK: EnterprisePack = {
  id: 'pci-dss',
  name: 'PCI-DSS Compliance',
  description: 'Payment Card Industry Data Security Standard — cardholder data protection, network security',
  framework: 'PCI-DSS',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['finance', 'payments', 'cardholder-data', 'pci'],
  rules: [
    {
      id: 'pci-001',
      name: 'PAN Detection',
      description: 'Block prompts containing Primary Account Numbers (credit card numbers)',
      severity: 'critical',
      type: 'rego',
      section: 'Req 3.4',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  regex.match("\\b[0-9]{16}\\b", input.prompt)
  msg := "PAN detected in prompt — must be masked per PCI-DSS Req 3.4"
}`,
      tags: ['pan', 'card-data'],
    },
    {
      id: 'pci-002',
      name: 'CVV Prohibition',
      description: 'Never store or log card verification values',
      severity: 'critical',
      type: 'rego',
      section: 'Req 3.2',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  input.prompt contains "CVV"
  msg := "CVV must never be stored or logged per PCI-DSS Req 3.2"
}

deny contains msg if {
  input.prompt contains "CVC"
  msg := "CVC must never be stored or logged per PCI-DSS Req 3.2"
}`,
      tags: ['cvv', 'card-data'],
    },
    {
      id: 'pci-003',
      name: 'Encryption in Transit',
      description: 'All cardholder data must be encrypted in transit (TLS 1.2+)',
      severity: 'critical',
      type: 'rego',
      section: 'Req 4.1',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  input.transmitCardData == true
  input.tlsVersion < "1.2"
  msg := "Cardholder data must use TLS 1.2+ per PCI-DSS Req 4.1"
}`,
      tags: ['encryption', 'tls'],
    },
    {
      id: 'pci-004',
      name: 'Access Logging',
      description: 'All access to cardholder data must be logged',
      severity: 'high',
      type: 'rego',
      section: 'Req 10.1',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  input.accessCardData == true
  not input.auditLog.accessTime
  msg := "Cardholder data access must be logged per PCI-DSS Req 10.1"
}`,
      tags: ['audit', 'logging'],
    },
    {
      id: 'pci-005',
      name: 'Network Segmentation',
      description: 'AI systems must be in a segmented network zone',
      severity: 'medium',
      type: 'rego',
      section: 'Req 1.3',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  input.processCardData == true
  input.networkZone != "cardholder-environment"
  msg := "AI processing card data must be in segmented network per PCI-DSS Req 1.3"
}`,
      tags: ['network', 'segmentation'],
    },
    {
      id: 'pci-006',
      name: 'Data Retention Limit',
      description: 'Cardholder data must not be retained beyond business need (max 90 days)',
      severity: 'high',
      type: 'rego',
      section: 'Req 3.1',
      framework: 'PCI-DSS',
      content: `deny contains msg if {
  input.storeCardData == true
  input.retentionDays > 90
  msg := "Card data retention exceeds 90 days per PCI-DSS Req 3.1"
}`,
      tags: ['retention', 'data-lifecycle'],
    },
  ],
};

// ─── SOC2 Pack ──────────────────────────────────────────

export const SOC2_PACK: EnterprisePack = {
  id: 'soc2',
  name: 'SOC 2 Type II',
  description: 'SOC 2 Trust Service Criteria — security, availability, processing integrity, confidentiality, privacy',
  framework: 'SOC2',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['enterprise', 'trust-criteria', 'audit'],
  rules: [
    {
      id: 'soc2-001',
      name: 'Access Control Review',
      description: 'User access to AI systems must be reviewed quarterly',
      severity: 'high',
      type: 'rego',
      section: 'CC6.1',
      framework: 'SOC2',
      content: `deny contains msg if {
  input.lastAccessReview == ""
  msg := "Access control review required quarterly per SOC2 CC6.1"
}`,
      tags: ['access-control', 'review'],
    },
    {
      id: 'soc2-002',
      name: 'Change Management',
      description: 'AI model changes must go through change management process',
      severity: 'high',
      type: 'rego',
      section: 'CC8.1',
      framework: 'SOC2',
      content: `deny contains msg if {
  input.deployModel == true
  not input.changeTicket.approved
  msg := "Model deployment requires approved change ticket per SOC2 CC8.1"
}`,
      tags: ['change-management', 'deployment'],
    },
    {
      id: 'soc2-003',
      name: 'Incident Response',
      description: 'AI-related incidents must be reported within 24 hours',
      severity: 'medium',
      type: 'rego',
      section: 'CC7.3',
      framework: 'SOC2',
      content: `deny contains msg if {
  input.incidentSeverity in ["critical", "high"]
  not input.incidentReported
  msg := "Incidents must be reported within 24 hours per SOC2 CC7.3"
}`,
      tags: ['incident-response', 'reporting'],
    },
    {
      id: 'soc2-004',
      name: 'Data Classification',
      description: 'All data processed by AI must be classified',
      severity: 'medium',
      type: 'rego',
      section: 'CC6.7',
      framework: 'SOC2',
      content: `deny contains msg if {
  not input.dataClassification
  msg := "Data must be classified before AI processing per SOC2 CC6.7"
}`,
      tags: ['data-classification'],
    },
    {
      id: 'soc2-005',
      name: 'Availability SLA',
      description: 'AI systems must maintain 99.9% availability',
      severity: 'medium',
      type: 'rego',
      section: 'A1.2',
      framework: 'SOC2',
      content: `deny contains msg if {
  input.uptime < 99.9
  msg := "AI system availability below 99.9% SLA per SOC2 A1.2"
}`,
      tags: ['availability', 'sla'],
    },
    {
      id: 'soc2-006',
      name: 'Processing Integrity',
      description: 'AI outputs must be validated for accuracy and completeness',
      severity: 'high',
      type: 'rego',
      section: 'PI1.1',
      framework: 'SOC2',
      content: `deny contains msg if {
  not input.outputValidated
  msg := "AI output must be validated for processing integrity per SOC2 PI1.1"
}`,
      tags: ['processing-integrity', 'validation'],
    },
  ],
};

// ─── ABDM Pack ──────────────────────────────────────────

export const ABDM_PACK: EnterprisePack = {
  id: 'abdm',
  name: 'ABDM / ABHA Compliance',
  description: 'Ayushman Bharat Digital Mission — ABHA verification, health record linking, consent management',
  framework: 'ABDM',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['india', 'healthcare', 'abha', 'abdm', 'abdm'],
  rules: [
    {
      id: 'abdm-001',
      name: 'ABHA Verification Required',
      description: 'Patient must have verified ABHA ID before health record access',
      severity: 'critical',
      type: 'rego',
      section: 'ABDM-001',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.accessHealthRecords == true
  not input.patient.abhaVerified
  msg := "ABHA verification required before health record access per ABDM guidelines"
}`,
      tags: ['abha', 'verification'],
    },
    {
      id: 'abdm-002',
      name: 'Consent Required for Sharing',
      description: 'Health records can only be shared with explicit patient consent via ABDM consent manager',
      severity: 'critical',
      type: 'rego',
      section: 'ABDM-002',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.shareHealthRecords == true
  not input.consent.id
  msg := "Explicit consent required for health record sharing via ABDM consent manager"
}`,
      tags: ['consent', 'sharing'],
    },
    {
      id: 'abdm-003',
      name: 'Health ID Format',
      description: 'ABHA ID must follow 14-digit format (XXXX XXXX XXXX)',
      severity: 'medium',
      type: 'rego',
      section: 'ABDM-003',
      framework: 'ABDM',
      content: `deny contains msg if {
  not regex.match("^[0-9]{14}$", input.patient.abhaId)
  msg := "ABHA ID must be 14 digits per ABDM specification"
}`,
      tags: ['abha', 'validation'],
    },
    {
      id: 'abdm-004',
      name: 'FHIR R4 Compliance',
      description: 'Health records must be in FHIR R4 format for ABDM interoperability',
      severity: 'high',
      type: 'rego',
      section: 'ABDM-004',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.healthRecord.format != "FHIR-R4"
  msg := "Health records must be in FHIR R4 format per ABDM interoperability standards"
}`,
      tags: ['fhir', 'interoperability'],
    },
    {
      id: 'abdm-005',
      name: 'Data Localization — India',
      description: 'Health records must be stored within Indian borders',
      severity: 'critical',
      type: 'rego',
      section: 'ABDM-005',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.storeHealthData == true
  not input.region in ["ap-south-1", "ap-south-2", "in-west-1", "in-south-1"]
  msg := "Health data must be stored in India per ABDM data localization requirements"
}`,
      tags: ['residency', 'india'],
    },
    {
      id: 'abdm-006',
      name: 'Gateway Registration',
      description: 'Health records must be registered with ABDM Health Information Exchange & Consent Manager (HIE-CM)',
      severity: 'high',
      type: 'rego',
      section: 'ABDM-006',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.linkHealthRecords == true
  not input.abdmGatewayRegistered
  msg := "Health records must be registered with ABDM HIE-CM gateway"
}`,
      tags: ['gateway', 'registration'],
    },
    {
      id: 'abdm-007',
      name: 'Audit Trail for Health Data',
      description: 'All health data access must be logged with ABHA ID and timestamp',
      severity: 'high',
      type: 'rego',
      section: 'ABDM-007',
      framework: 'ABDM',
      content: `deny contains msg if {
  input.accessHealthData == true
  not input.auditLog.abhaId
  msg := "Health data access must include ABHA ID in audit trail"
}`,
      tags: ['audit', 'logging'],
    },
  ],
};

// ─── AI Safety Pack ─────────────────────────────────────

export const AI_SAFETY_PACK: EnterprisePack = {
  id: 'ai-safety',
  name: 'AI Safety & Responsible AI',
  description: 'Bias detection, toxicity filtering, hallucination prevention, explainability requirements',
  framework: 'AI-SAFETY',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['ai', 'safety', 'bias', 'toxicity', 'hallucination'],
  rules: [
    {
      id: 'ai-001',
      name: 'Bias Detection',
      description: 'AI outputs must be checked for demographic bias before delivery',
      severity: 'critical',
      type: 'rego',
      section: 'AI-SAFETY-001',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.outputType == "recommendation"
  not input.biasCheck.passed
  msg := "AI output must pass bias check before delivery"
}`,
      tags: ['bias', 'fairness'],
    },
    {
      id: 'ai-002',
      name: 'Toxicity Filter',
      description: 'AI responses must not contain toxic, harmful, or offensive content',
      severity: 'critical',
      type: 'rego',
      section: 'AI-SAFETY-002',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.toxicityScore > 0.7
  msg := "AI response toxicity score exceeds threshold (0.7)"
}`,
      tags: ['toxicity', 'content-filtering'],
    },
    {
      id: 'ai-003',
      name: 'Hallucination Detection',
      description: 'AI must not fabricate facts, citations, or statistics',
      severity: 'high',
      type: 'rego',
      section: 'AI-SAFETY-003',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.hallucinationScore > 0.3
  msg := "AI response may contain hallucinated content (score > 0.3)"
}`,
      tags: ['hallucination', 'fact-checking'],
    },
    {
      id: 'ai-004',
      name: 'Explainability Required',
      description: 'High-stakes AI decisions must include explanation of reasoning',
      severity: 'high',
      type: 'rego',
      section: 'AI-SAFETY-004',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.decisionImpact in ["high", "critical"]
  not input.explanation
  msg := "High-impact AI decisions must include explanation"
}`,
      tags: ['explainability', 'transparency'],
    },
    {
      id: 'ai-005',
      name: 'Model Card Required',
      description: 'All AI models must have published model cards with capabilities and limitations',
      severity: 'medium',
      type: 'rego',
      section: 'AI-SAFETY-005',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  not input.model.modelCard
  msg := "AI model must have a published model card"
}`,
      tags: ['model-card', 'documentation'],
    },
    {
      id: 'ai-006',
      name: 'Human-in-the-Loop',
      description: 'Critical AI decisions must have human review capability',
      severity: 'critical',
      type: 'rego',
      section: 'AI-SAFETY-006',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.decisionImpact == "critical"
  not input.humanReviewEnabled
  msg := "Critical AI decisions must have human-in-the-loop review"
}`,
      tags: ['human-review', 'critical-decisions'],
    },
    {
      id: 'ai-007',
      name: 'Data Provenance',
      description: 'Training data sources must be documented and traceable',
      severity: 'medium',
      type: 'rego',
      section: 'AI-SAFETY-007',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  not input.model.trainingDataProvenance
  msg := "Model training data provenance must be documented"
}`,
      tags: ['provenance', 'training-data'],
    },
    {
      id: 'ai-008',
      name: 'Safety Testing Required',
      description: 'AI models must undergo red-team safety testing before deployment',
      severity: 'high',
      type: 'rego',
      section: 'AI-SAFETY-008',
      framework: 'AI-SAFETY',
      content: `deny contains msg if {
  input.deployModel == true
  not input.safetyTesting.completed
  msg := "Model must complete safety testing before deployment"
}`,
      tags: ['red-team', 'safety-testing'],
    },
  ],
};

// ─── Banking Pack ───────────────────────────────────────

export const BANKING_PACK: EnterprisePack = {
  id: 'banking',
  name: 'RBI Banking Compliance',
  description: 'Reserve Bank of India regulations — KYC/AML, data localization, fair practices, digital lending',
  framework: 'RBI',
  version: '1.0.0',
  author: 'ACG Enterprise',
  tags: ['india', 'banking', 'rbi', 'kyc', 'aml'],
  rules: [
    {
      id: 'bank-001',
      name: 'KYC Verification',
      description: 'Customer identity must be verified via RBI-approved KYC before AI-assisted onboarding',
      severity: 'critical',
      type: 'rego',
      section: 'KYC Master Direction',
      framework: 'RBI',
      content: `deny contains msg if {
  input.aiAssistedOnboarding == true
  not input.customer.kycVerified
  msg := "KYC verification required before AI-assisted onboarding per RBI Master Direction"
}`,
      tags: ['kyc', 'onboarding'],
    },
    {
      id: 'bank-002',
      name: 'AML Screening',
      description: 'AI must screen customers against RBI/UN sanctions lists',
      severity: 'critical',
      type: 'rego',
      section: 'PMLA 2002',
      framework: 'RBI',
      content: `deny contains msg if {
  input.newCustomer == true
  not input.amlScreening.completed
  msg := "AML screening required for new customers per PMLA 2002"
}`,
      tags: ['aml', 'sanctions'],
    },
    {
      id: 'bank-003',
      name: 'Fair Practices Code',
      description: 'AI must not engage in discriminatory lending or pricing',
      severity: 'high',
      type: 'rego',
      section: 'Fair Practices Code',
      framework: 'RBI',
      content: `deny contains msg if {
  input.lendingDecision == true
  input.discriminationFactors contains "gender"
  msg := "Discriminatory lending decisions prohibited per RBI Fair Practices Code"
}

deny contains msg if {
  input.lendingDecision == true
  input.discriminationFactors contains "religion"
  msg := "Discriminatory lending decisions prohibited per RBI Fair Practices Code"
}`,
      tags: ['fair-practices', 'discrimination'],
    },
    {
      id: 'bank-004',
      name: 'Data Localization',
      description: 'Payment data must be stored exclusively in India',
      severity: 'critical',
      type: 'rego',
      section: 'RBI Data Localization circular',
      framework: 'RBI',
      content: `deny contains msg if {
  input.paymentData == true
  not input.region in ["ap-south-1", "ap-south-2"]
  msg := "Payment data must be stored in India per RBI circular on storage of payment system data"
}`,
      tags: ['data-locality', 'payment-data'],
    },
    {
      id: 'bank-005',
      name: 'Digital Lending Disclosure',
      description: 'AI-powered digital lending must disclose AI involvement to borrowers',
      severity: 'high',
      type: 'rego',
      section: 'Digital Lending Guidelines 2022',
      framework: 'RBI',
      content: `deny contains msg if {
  input.digitalLending == true
  not input.aiDisclosure.shown
  msg := "AI involvement in lending must be disclosed to borrowers per RBI Digital Lending Guidelines"
}`,
      tags: ['digital-lending', 'disclosure'],
    },
    {
      id: 'bank-006',
      name: 'Grievance Redressal',
      description: 'AI-driven decisions must have human grievance redressal mechanism',
      severity: 'high',
      type: 'rego',
      section: 'RBI Ombudsman Scheme',
      framework: 'RBI',
      content: `deny contains msg if {
  input.aiDecision == true
  not input.grievanceRedressal.humanAvailable
  msg := "Human grievance redressal required for AI decisions per RBI Ombudsman Scheme"
}`,
      tags: ['grievance', 'ombudsman'],
    },
  ],
};

// ─── Pack Registry ──────────────────────────────────────

export const ALL_PACKS: EnterprisePack[] = [
  HIPAA_PACK,
  PCI_DSS_PACK,
  SOC2_PACK,
  ABDM_PACK,
  AI_SAFETY_PACK,
  BANKING_PACK,
];

export function getPack(id: string): EnterprisePack | undefined {
  return ALL_PACKS.find((p) => p.id === id);
}

export function getPacksByFramework(framework: string): EnterprisePack[] {
  return ALL_PACKS.filter((p) => p.framework === framework);
}

export function getTotalRules(): number {
  return ALL_PACKS.reduce((sum, pack) => sum + pack.rules.length, 0);
}
