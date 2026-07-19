import { AIRouter, createDefaultRouter } from '@acg/ai-router';
import { RiskEngine, createDefaultRiskEngine } from '@acg/risk-engine';
import { GovernanceEngine, createDefaultGovernanceEngine } from '@acg/governance-engine';
import { ComplianceEngine, createDefaultComplianceEngine } from '@acg/compliance-engine';

let router: AIRouter | null = null;
let riskEngine: RiskEngine | null = null;
let governanceEngine: GovernanceEngine | null = null;
let complianceEngine: ComplianceEngine | null = null;

export function getRouter(): AIRouter {
  if (!router) router = createDefaultRouter();
  return router;
}

export function getRiskEngine(): RiskEngine {
  if (!riskEngine) riskEngine = createDefaultRiskEngine();
  return riskEngine;
}

export function getGovernanceEngine(): GovernanceEngine {
  if (!governanceEngine) governanceEngine = createDefaultGovernanceEngine();
  return governanceEngine;
}

export function getComplianceEngine(): ComplianceEngine {
  if (!complianceEngine) complianceEngine = createDefaultComplianceEngine();
  return complianceEngine;
}

export function resetAllEngines(): void {
  router = null;
  riskEngine = null;
  governanceEngine = null;
  complianceEngine = null;
}
