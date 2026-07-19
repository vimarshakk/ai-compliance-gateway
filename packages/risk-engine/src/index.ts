/**
 * Risk Engine — Real-time risk scoring for AI requests
 *
 * Scores every request on multiple dimensions:
 * - PII risk (types and volume of PII detected)
 * - Content risk (toxicity, bias, harmful content)
 * - Compliance risk (violation of regulatory requirements)
 * - Cost risk (unusual spending patterns)
 * - Security risk (prompt injection, jailbreak attempts)
 * - Behavioral risk (anomalous usage patterns)
 *
 * Produces a composite risk score (0-100) and per-dimension breakdown.
 */

export interface RiskDimension {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  factors: RiskFactor[];
  mitigated: boolean;
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  mitigated: boolean;
}

export interface RiskAssessment {
  requestId: string;
  compositeScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dimensions: RiskDimension[];
  recommendation: 'allow' | 'warn' | 'block' | 'escalate';
  explanation: string;
  processingMs: number;
}

export interface RiskContext {
  requestId: string;
  organizationId: string;
  userId: string;
  model: string;
  provider: string;
  messages: Array<{ role: string; content: string }>;
  piiEntities: Array<{ type: string; confidence: number; value: string }>;
  policyViolations: string[];
  previousRequests?: Array<{ timestamp: Date; cost: number; blocked: boolean; piiDetected: boolean }>;
  compliancePacks: string[];
}

export interface RiskRule {
  id: string;
  dimension: string;
  condition: (ctx: RiskContext) => RiskFactor | null;
  enabled: boolean;
}

export class RiskEngine {
  private rules: RiskRule[] = [];
  private thresholds = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  };

  constructor() {
    this.registerBuiltinRules();
  }

  addRule(rule: RiskRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  assess(context: RiskContext): RiskAssessment {
    const start = Date.now();
    const dimensions = this.evaluateDimensions(context);
    const compositeScore = this.computeCompositeScore(dimensions);
    const riskLevel = this.scoreToLevel(compositeScore);
    const recommendation = this.determineRecommendation(riskLevel, dimensions);
    const explanation = this.generateExplanation(riskLevel, dimensions);

    return {
      requestId: context.requestId,
      compositeScore,
      riskLevel,
      dimensions,
      recommendation,
      explanation,
      processingMs: Date.now() - start,
    };
  }

  private evaluateDimensions(context: RiskContext): RiskDimension[] {
    const dimensions: RiskDimension[] = [
      this.evaluatePIIDimension(context),
      this.evaluateContentDimension(context),
      this.evaluateComplianceDimension(context),
      this.evaluateCostDimension(context),
      this.evaluateSecurityDimension(context),
      this.evaluateBehavioralDimension(context),
    ];

    // Apply custom rules
    for (const rule of this.rules.filter((r) => r.enabled)) {
      const factor = rule.condition(context);
      if (factor) {
        const dim = dimensions.find((d) => d.name === rule.dimension);
        if (dim) {
          dim.factors.push(factor);
          dim.score = Math.min(100, dim.score + this.severityToScore(factor.severity));
          dim.mitigated = false;
        }
      }
    }

    return dimensions;
  }

  private evaluatePIIDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    if (context.piiEntities.length > 0) {
      const criticalTypes = ['SSN', 'AADHAAR', 'CREDIT_CARD', 'MEDICAL_RECORD'];
      const highTypes = ['EMAIL', 'PHONE', 'IP_ADDRESS'];
      const criticalCount = context.piiEntities.filter((e) => criticalTypes.includes(e.type)).length;
      const highCount = context.piiEntities.filter((e) => highTypes.includes(e.type)).length;

      if (criticalCount > 0) {
        factors.push({
          type: 'critical_pii',
          severity: 'critical',
          description: `${criticalCount} critical PII entities detected`,
          evidence: context.piiEntities.filter((e) => criticalTypes.includes(e.type)).map((e) => e.type).join(', '),
          mitigated: false,
        });
        score += criticalCount * 30;
      }

      if (highCount > 0) {
        factors.push({
          type: 'high_pii',
          severity: 'high',
          description: `${highCount} high-risk PII entities detected`,
          evidence: context.piiEntities.filter((e) => highTypes.includes(e.type)).map((e) => e.type).join(', '),
          mitigated: false,
        });
        score += highCount * 15;
      }

      if (context.piiEntities.length > 5) {
        factors.push({
          type: 'pii_volume',
          severity: 'high',
          description: `High PII volume: ${context.piiEntities.length} entities`,
          evidence: `${context.piiEntities.length} entities in single request`,
          mitigated: false,
        });
        score += 20;
      }
    }

    return {
      name: 'pii',
      score: Math.min(100, score),
      weight: 0.30,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private evaluateContentDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    const content = context.messages.map((m) => m.content).join(' ').toLowerCase();

    const harmfulPatterns = [
      { pattern: /\b(how to|instructions for|steps to)\b.*(hack|exploit|attack|bypass)/i, severity: 'high' as const, type: 'harmful_content' },
      { pattern: /\b(bomb|weapon|poison|drug recipe)\b/i, severity: 'critical' as const, type: 'dangerous_content' },
      { pattern: /\b(jailbreak|ignore instructions|bypass filter|ignore rules)\b/i, severity: 'high' as const, type: 'prompt_injection' },
      { pattern: /\b(harmful|discriminat|hate speech|slur)\b/i, severity: 'medium' as const, type: 'toxic_content' },
    ];

    for (const { pattern, severity, type } of harmfulPatterns) {
      if (pattern.test(content)) {
        factors.push({
          type,
          severity,
          description: `Potentially ${type.replace(/_/g, ' ')} detected`,
          evidence: content.slice(0, 200),
          mitigated: false,
        });
        score += this.severityToScore(severity);
      }
    }

    return {
      name: 'content',
      score: Math.min(100, score),
      weight: 0.20,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private evaluateComplianceDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    if (context.policyViolations.length > 0) {
      factors.push({
        type: 'policy_violation',
        severity: 'high',
        description: `${context.policyViolations.length} policy violations detected`,
        evidence: context.policyViolations.join('; '),
        mitigated: false,
      });
      score += context.policyViolations.length * 20;
    }

    if (context.compliancePacks.includes('hipaa') && context.piiEntities.some((e) => e.type === 'MEDICAL_RECORD')) {
      factors.push({
        type: 'hipaa_phi_exposure',
        severity: 'critical',
        description: 'PHI detected in HIPAA-governed context',
        evidence: 'Medical record data in HIPAA-protected request',
        mitigated: false,
      });
      score += 40;
    }

    return {
      name: 'compliance',
      score: Math.min(100, score),
      weight: 0.25,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private evaluateCostDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    if (context.previousRequests && context.previousRequests.length > 0) {
      const recentCosts = context.previousRequests.slice(-20).map((r) => r.cost);
      const avgCost = recentCosts.reduce((a, b) => a + b, 0) / recentCosts.length;
      const currentEstimate = context.messages.reduce((sum, m) => sum + m.content.length / 4, 0) * 0.00003;

      if (currentEstimate > avgCost * 10 && avgCost > 0) {
        factors.push({
          type: 'cost_anomaly',
          severity: 'medium',
          description: 'Request cost significantly above average',
          evidence: `Current estimate: $${currentEstimate.toFixed(4)}, avg: $${avgCost.toFixed(4)}`,
          mitigated: false,
        });
        score += 30;
      }

      const blockedRate = context.previousRequests.filter((r) => r.blocked).length / context.previousRequests.length;
      if (blockedRate > 0.3) {
        factors.push({
          type: 'high_block_rate',
          severity: 'medium',
          description: `${(blockedRate * 100).toFixed(0)}% of recent requests were blocked`,
          evidence: `${context.previousRequests.filter((r) => r.blocked).length}/${context.previousRequests.length} blocked`,
          mitigated: false,
        });
        score += 20;
      }
    }

    return {
      name: 'cost',
      score: Math.min(100, score),
      weight: 0.10,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private evaluateSecurityDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    const content = context.messages.map((m) => m.content).join(' ');

    const injectionPatterns = [
      /system\s*:\s*you\s*are/i,
      /ignore\s*(all|previous|above)\s*(instructions|prompts|rules)/i,
      /forget\s*(everything|all|your)\s*(instructions|rules|programming)/i,
      /\bDAN\b.*\bDo\s*Anything\s*Now\b/i,
      /\bjailbreak\b/i,
      /act\s*as\s*if\s*you\s*have\s*no\s*(restrictions|rules|limitations)/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(content)) {
        factors.push({
          type: 'prompt_injection',
          severity: 'critical',
          description: 'Potential prompt injection attack detected',
          evidence: content.slice(0, 200),
          mitigated: false,
        });
        score += 40;
        break;
      }
    }

    const totalContentLength = content.length;
    if (totalContentLength > 50000) {
      factors.push({
        type: 'large_payload',
        severity: 'medium',
        description: `Unusually large prompt: ${totalContentLength} characters`,
        evidence: `${totalContentLength} chars (typical max: 10000)`,
        mitigated: false,
      });
      score += 15;
    }

    return {
      name: 'security',
      score: Math.min(100, score),
      weight: 0.10,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private evaluateBehavioralDimension(context: RiskContext): RiskDimension {
    const factors: RiskFactor[] = [];
    let score = 0;

    if (context.previousRequests && context.previousRequests.length > 0) {
      const piiRate = context.previousRequests.filter((r) => r.piiDetected).length / context.previousRequests.length;
      if (piiRate > 0.5) {
        factors.push({
          type: 'persistent_pii',
          severity: 'high',
          description: `User consistently sends PII: ${(piiRate * 100).toFixed(0)}% of requests`,
          evidence: `${context.previousRequests.filter((r) => r.piiDetected).length}/${context.previousRequests.length} requests with PII`,
          mitigated: false,
        });
        score += 25;
      }

      const requestsLastMinute = context.previousRequests.filter(
        (r) => Date.now() - new Date(r.timestamp).getTime() < 60_000
      ).length;
      if (requestsLastMinute > 30) {
        factors.push({
          type: 'rate_anomaly',
          severity: 'medium',
          description: `High request rate: ${requestsLastMinute} requests in the last minute`,
          evidence: `${requestsLastMinute}/60 requests/min`,
          mitigated: false,
        });
        score += 20;
      }
    }

    return {
      name: 'behavioral',
      score: Math.min(100, score),
      weight: 0.05,
      factors,
      mitigated: factors.length === 0,
    };
  }

  private computeCompositeScore(dimensions: RiskDimension[]): number {
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  private scoreToLevel(score: number): RiskAssessment['riskLevel'] {
    if (score >= this.thresholds.critical) return 'critical';
    if (score >= this.thresholds.high) return 'high';
    if (score >= this.thresholds.medium) return 'medium';
    return 'low';
  }

  private determineRecommendation(level: RiskAssessment['riskLevel'], dimensions: RiskDimension[]): RiskAssessment['recommendation'] {
    if (level === 'critical') return 'block';
    if (level === 'high') return 'escalate';
    if (level === 'medium') return 'warn';
    return 'allow';
  }

  private generateExplanation(level: RiskAssessment['riskLevel'], dimensions: RiskDimension[]): string {
    const highDimensions = dimensions.filter((d) => d.score >= 50);
    if (highDimensions.length === 0) return 'No significant risks detected.';

    const issues = highDimensions.map((d) => {
      const topFactor = d.factors.sort((a, b) => this.severityToScore(b.severity) - this.severityToScore(a.severity))[0];
      return `${d.name}: ${topFactor?.description ?? 'elevated score'}`;
    });

    return `Risk level: ${level}. Key concerns: ${issues.join('; ')}`;
  }

  private severityToScore(severity: RiskFactor['severity']): number {
    switch (severity) {
      case 'critical': return 40;
      case 'high': return 25;
      case 'medium': return 15;
      case 'low': return 5;
    }
  }

  private registerBuiltinRules(): void {
    this.addRule({
      id: 'suspicious_model_switch',
      dimension: 'security',
      condition: (ctx) => {
        if (ctx.model.includes('uncensored') || ctx.model.includes('unfiltered')) {
          return {
            type: 'uncensored_model',
            severity: 'critical',
            description: 'Request to use uncensored/unfiltered model',
            evidence: `Model: ${ctx.model}`,
            mitigated: false,
          };
        }
        return null;
      },
      enabled: true,
    });
  }
}

export function createDefaultRiskEngine(): RiskEngine {
  return new RiskEngine();
}
