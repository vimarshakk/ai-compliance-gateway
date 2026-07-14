// ============================================================
// @acg/kernel — Compliance Score Engine
// ============================================================
// Centralized scoring logic shared by CLI, Gateway, and Admin.
// Consumes scan findings and BOM entries to produce a
// structured compliance score breakdown.
// ============================================================

import type { BomEntry } from './bom-adapter.js';

// ---- Types ----

export interface ScanFinding {
  type: string;
  severity: string;
  file: string;
  line?: number;
  message: string;
}

export interface ScanSummary {
  sdks: string[];
  promptsFound: number;
  secretsFound: number;
  envVarsFound: number;
  configsFound: number;
  modelRefs: string[];
  riskScore: number;
}

export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  items: string[];
}

export interface ComplianceScoreResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  breakdowns: ScoreBreakdown[];
  recommendations: string[];
}

// ---- Scoring Engine ----

export class ComplianceScoreEngine {
  /**
   * Calculate compliance score from scan + BOM data.
   * Weights: Secrets 25 | SDK 20 | Env 15 | Guardrails 20 | Observability 10 | Prompts 10 = 100
   */
  calculate(
    scanSummary: ScanSummary,
    bomEntries: BomEntry[]
  ): ComplianceScoreResult {
    const breakdowns: ScoreBreakdown[] = [];

    // Secrets score (25 pts)
    const secretsPenalty = Math.min(25, scanSummary.secretsFound * 25);
    breakdowns.push({
      category: 'Secret Management',
      score: 25 - secretsPenalty,
      maxScore: 25,
      items: scanSummary.secretsFound === 0
        ? ['No secrets detected']
        : [`${scanSummary.secretsFound} secrets detected — rotate immediately`],
    });

    // SDK coverage (20 pts)
    const sdkScore = Math.min(20, (scanSummary.sdks.length > 0 ? 10 : 0) + (scanSummary.configsFound > 0 ? 10 : 0));
    breakdowns.push({
      category: 'SDK Coverage',
      score: sdkScore,
      maxScore: 20,
      items: [
        ...scanSummary.sdks.map(s => `SDK: ${s}`),
        ...(scanSummary.configsFound > 0 ? [`${scanSummary.configsFound} observability config(s) found`] : []),
      ],
    });

    // Env hygiene (15 pts)
    const envPenalty = Math.min(15, scanSummary.envVarsFound * 3);
    breakdowns.push({
      category: 'Environment Hygiene',
      score: 15 - envPenalty,
      maxScore: 15,
      items: scanSummary.envVarsFound === 0
        ? ['No AI env vars exposed']
        : [`${scanSummary.envVarsFound} AI env vars detected`],
    });

    // Guardrail coverage (20 pts)
    const guardrailTools = bomEntries.filter(e => e.category === 'guardrail' || e.category === 'policy');
    const guardrailScore = Math.min(20, guardrailTools.length * 10);
    breakdowns.push({
      category: 'Guardrail Coverage',
      score: guardrailScore,
      maxScore: 20,
      items: guardrailTools.length === 0
        ? ['No guardrail tools detected']
        : guardrailTools.map(g => `Tool: ${g.name}`),
    });

    // Observability (10 pts)
    const obsTools = bomEntries.filter(e => e.category === 'observability');
    const obsScore = Math.min(10, obsTools.length * 5);
    breakdowns.push({
      category: 'Observability',
      score: obsScore,
      maxScore: 10,
      items: obsTools.length === 0
        ? ['No observability tools detected']
        : obsTools.map(o => `Tool: ${o.name}`),
    });

    // Prompt hygiene (10 pts)
    const promptPenalty = Math.min(10, scanSummary.promptsFound * 5);
    breakdowns.push({
      category: 'Prompt Hygiene',
      score: 10 - promptPenalty,
      maxScore: 10,
      items: scanSummary.promptsFound === 0
        ? ['No untracked prompt files']
        : [`${scanSummary.promptsFound} prompt file(s) detected — review for safety`],
    });

    const overallScore = breakdowns.reduce((s, b) => s + b.score, 0);
    const maxScore = breakdowns.reduce((s, b) => s + b.maxScore, 0);
    const percentage = Math.round((overallScore / maxScore) * 100);

    // Generate recommendations
    const recommendations: string[] = [];
    if (scanSummary.secretsFound > 0) recommendations.push('CRITICAL: Rotate detected secrets immediately');
    if (guardrailTools.length === 0) recommendations.push('Add OPA for policy enforcement');
    if (obsTools.length === 0) recommendations.push('Add Langfuse for AI observability');
    if (scanSummary.envVarsFound > 0) recommendations.push('Review env vars — move to secrets manager');
    if (percentage >= 80) recommendations.push('Strong compliance posture');

    return { overallScore, maxScore, percentage, breakdowns, recommendations };
  }
}
