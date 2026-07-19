# Compliance Frameworks

ACG supports multiple compliance frameworks through composable compliance packs.

## Supported Frameworks

### DPDP — India Data Protection & Digital Privacy Act 2023

**Region:** India
**Status:** ✅ Implemented

Key requirements:
- Data consent management
- Data localization (Indian data must stay in India)
- Purpose limitation
- Data minimization
- Right to erasure
- Breach notification

**Pack ID:** `dpdp`

### HIPAA — Health Insurance Portability & Accountability Act

**Region:** United States
**Status:** ✅ Implemented

Key requirements:
- PHI (Protected Health Information) detection
- Audit trails for all PHI access
- Encryption at rest and in transit
- Access controls (minimum necessary)
- Business Associate Agreements
- De-identification standards

**Pack ID:** `hipaa`

### GDPR — General Data Protection Regulation

**Region:** European Union
**Status:** ✅ Implemented

Key requirements:
- Automated decision-making transparency (Art. 22-25)
- Data Protection Impact Assessment (DPIA)
- Data subject rights (access, rectification, erasure, portability)
- Consent management
- Data breach notification (72 hours)
- Privacy by design

**Pack ID:** `gdpr`

### PCI-DSS — Payment Card Industry Data Security Standard

**Region:** Global
**Status:** ✅ Implemented

Key requirements:
- PAN (Primary Account Number) detection
- CVV/CVC prohibition (never store)
- Encryption of cardholder data
- Network segmentation
- Access control
- Regular security testing

**Pack ID:** `pci-dss`

### SOC 2 — Service Organization Control

**Region:** United States
**Status:** ✅ Implemented

Key requirements:
- Security (CC6-CC8)
- Availability (A1)
- Processing Integrity (PI1-PI6)
- Confidentiality
- Privacy

**Pack ID:** `soc2`

### ABDM — Ayushman Bharat Digital Mission

**Region:** India
**Status:** ✅ Implemented

Key requirements:
- ABHA (Ayushman Bharat Health Account) verification
- Consent management for health records
- FHIR R4 interoperability
- Health data exchange
- Data residency compliance
- Healthcare professional verification

**Pack ID:** `abdm`

### AI Safety

**Region:** Global
**Status:** ✅ Implemented

Key requirements:
- Bias detection and mitigation
- Toxicity filtering
- Hallucination detection
- Explainability requirements
- Red-team testing support
- Model transparency

**Pack ID:** `ai-safety`

### Banking — RBI Regulations

**Region:** India
**Status:** ✅ Implemented

Key requirements:
- KYC/AML compliance
- Fair practices code
- Data localization
- Digital lending guidelines
- Customer consent
- Transaction monitoring

**Pack ID:** `banking`

## Planned Frameworks

| Framework | Region | Target Version |
|-----------|--------|---------------|
| ISO 27001 | Global | v4.0 |
| ISO 42001 | Global | v4.0 |
| NIST AI RMF | United States | v4.0 |
| EU AI Act | European Union | v4.0 |
| IRDAI | India | v5.0 |
| SEBI | India | v5.0 |

## Creating Custom Packs

### 1. Create Pack Directory

```
packages/enterprise-packs/my-custom-pack/
├── index.ts          # Pack definition
├── rules/            # OPA/Rego policies
├── tests/            # Rule tests
└── package.json
```

### 2. Define Pack

```typescript
export const myPack = {
  id: 'my-custom',
  name: 'My Custom Compliance',
  version: '1.0.0',
  rules: [
    {
      id: 'custom-rule-1',
      name: 'Custom Rule',
      description: 'Enforces custom compliance requirement',
      severity: 'high',
      enabled: true,
    },
  ],
};
```

### 3. Write OPA Rules

```rego
package acg.compliance.my_custom

default allow = false

allow {
  input.request.method == "POST"
  input.request.path == "/chat/completions"
  valid_compliance_header
}

valid_compliance_header {
  input.request.headers["x-compliance-pack"] == "my-custom"
}
```

### 4. Add Tests

```typescript
describe('My Custom Pack', () => {
  it('should enforce custom rule', async () => {
    const result = await evaluatePack('my-custom', testInput);
    expect(result.passed).toBe(true);
  });
});
```

## Evidence Generation

Each compliance evaluation generates evidence:

```json
{
  "id": "eval-123",
  "packId": "hipaa",
  "timestamp": "2024-01-15T10:30:00Z",
  "results": [
    {
      "ruleId": "phi-detection",
      "passed": true,
      "evidence": "No PHI detected in input"
    },
    {
      "ruleId": "audit-trail",
      "passed": true,
      "evidence": "Audit entry created with hash"
    }
  ],
  "score": 100,
  "chain": {
    "previousHash": "abc123...",
    "currentHash": "def456...",
    "signature": "..."
  }
}
```

## Audit Reports

ACG generates audit reports for compliance inspections:

```bash
acg compliance report --pack hipaa --format json
acg compliance report --pack gdpr --format pdf
acg compliance history --days 30
```

## See Also

- [SECURITY_MODEL.md](SECURITY_MODEL.md) — security architecture
- [THREAT_MODEL.md](THREAT_MODEL.md) — threat modeling
- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture
