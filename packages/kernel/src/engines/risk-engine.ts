// ============================================================
// @acg/kernel — Built-in Engine: Risk Engine
// ============================================================
// Evaluates risk score for AI requests based on content,
// model sensitivity, and organizational context.
// ============================================================

import type { Engine, EngineInput, EngineOutput, EngineMetadata } from '../engine-types.js';

export class RiskEngine implements Engine {
  metadata: EngineMetadata = {
    id: 'acg-risk',
    name: 'Risk Engine',
    version: '1.0.0',
    description: 'Evaluates risk score for AI requests',
    author: 'acg',
    scope: 'global',
    tags: ['risk', 'security'],
    stages: ['pre-request'],
    priority: 200,
  };

  private maxRiskScore: number;
  private autoBlock: boolean;

  constructor(config: {
    maxRiskScore?: number;
    autoBlock?: boolean;
  } = {}) {
    this.maxRiskScore = config.maxRiskScore ?? 80;
    this.autoBlock = config.autoBlock ?? true;
  }

  async execute(input: EngineInput): Promise<EngineOutput> {
    const { request, organization } = input;

    // Calculate risk score
    let riskScore = 0;
    const violations: EngineOutput['violations'] = [];

    // Check message content for risky patterns
    if (request.messages) {
      for (const msg of request.messages) {
        if (typeof msg.content !== 'string') continue;

        // PII risk
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(msg.content)) {
          riskScore += 30;
          violations.push({
            rule: 'pii-ssn',
            severity: 'high',
            message: 'Potential SSN detected in request',
          });
        }

        // Financial data risk
        if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(msg.content)) {
          riskScore += 40;
          violations.push({
            rule: 'pii-card',
            severity: 'critical',
            message: 'Potential credit card number detected',
          });
        }

        // Prompt injection patterns
        if (/ignore previous instructions|ignore all prior/i.test(msg.content)) {
          riskScore += 50;
          violations.push({
            rule: 'prompt-injection',
            severity: 'critical',
            message: 'Potential prompt injection detected',
          });
        }

        // Code execution risk
        if (/exec\(|eval\(|system\(|subprocess/i.test(msg.content)) {
          riskScore += 20;
          violations.push({
            rule: 'code-execution',
            severity: 'medium',
            message: 'Potential code execution pattern detected',
          });
        }
      }
    }

    // Model-based risk
    const highRiskModels = ['gpt-4', 'claude-3-opus'];
    if (request.model && highRiskModels.includes(request.model)) {
      riskScore += 10;
    }

    riskScore = Math.min(100, riskScore);

    const allow = !this.autoBlock || riskScore <= this.maxRiskScore;

    return {
      allow,
      metadata: {
        riskScore,
        maxRiskScore: this.maxRiskScore,
        riskLevel: riskScore >= 80 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 20 ? 'medium' : 'low',
      },
      violations: allow ? undefined : violations,
      evidence: {
        type: 'custom',
        data: { riskScore, violations },
      },
    };
  }

  validateConfig(config: Record<string, unknown>): boolean {
    if (config.maxRiskScore && (typeof config.maxRiskScore !== 'number' || config.maxRiskScore < 0 || config.maxRiskScore > 100)) return false;
    if (config.autoBlock && typeof config.autoBlock !== 'boolean') return false;
    return true;
  }
}
