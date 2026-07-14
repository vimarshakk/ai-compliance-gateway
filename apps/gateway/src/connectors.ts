import {
  LiteLLMConnector, PresidioAnalyzerConnector, PresidioAnonymizerConnector,
  OPAConnector, NeMoGuardrailsConnector, OTelCollectorConnector,
  NATSConnector, RedisConnector,
} from '@acg/connectors';
import { PromptWorkflow, ModerationWorkflow, EnhancedPromptWorkflow } from '@acg/workflows';
import { createDefaultRouter } from '@acg/ai-router';
import { createDefaultRiskEngine } from '@acg/risk-engine';
import { createDefaultGovernanceEngine } from '@acg/governance-engine';
import { createDefaultComplianceEngine } from '@acg/compliance-engine';

const env = {
  LITELLM_URL: process.env.LITELLM_URL ?? 'http://litellm:4000',
  LITELLM_API_KEY: process.env.LITELLM_MASTER_KEY ?? process.env.OPENAI_API_KEY ?? '',
  PRESIDIO_ANALYZER_URL: process.env.PRESIDIO_ANALYZER_URL ?? 'http://presidio-analyzer:3000',
  PRESIDIO_ANONYMIZER_URL: process.env.PRESIDIO_ANONYMIZER_URL ?? 'http://presidio-anonymizer:3000',
  OPA_URL: process.env.OPA_URL ?? 'http://opa:8181',
  GUARDRAILS_URL: process.env.GUARDRAILS_URL ?? 'http://nemo-guardrails:8000',
  OTEL_COLLECTOR_URL: process.env.OTEL_COLLECTOR_URL ?? 'http://otel-collector:4318',
  NATS_URL: process.env.NATS_URL ?? 'http://nats:4222',
  REDIS_URL: process.env.REDIS_URL ?? 'http://redis:6379',
};

export interface GatewayConnectors {
  litellm: LiteLLMConnector;
  presidioAnalyzer: PresidioAnalyzerConnector;
  presidioAnonymizer: PresidioAnonymizerConnector;
  opa: OPAConnector;
  guardrails: NeMoGuardrailsConnector;
  otel: OTelCollectorConnector;
  nats: NATSConnector;
  redis: RedisConnector;
  promptWorkflow: PromptWorkflow;
  moderationWorkflow: ModerationWorkflow;
  enhancedWorkflow: EnhancedPromptWorkflow;
}

export function createConnectors(): GatewayConnectors {
  const litellm = new LiteLLMConnector(env.LITELLM_URL, env.LITELLM_API_KEY);
  const presidioAnalyzer = new PresidioAnalyzerConnector(env.PRESIDIO_ANALYZER_URL);
  const presidioAnonymizer = new PresidioAnonymizerConnector(env.PRESIDIO_ANONYMIZER_URL);
  const opa = new OPAConnector(env.OPA_URL);
  const guardrails = new NeMoGuardrailsConnector(env.GUARDRAILS_URL);
  const otel = new OTelCollectorConnector(env.OTEL_COLLECTOR_URL);
  const nats = new NATSConnector(env.NATS_URL);
  const redis = new RedisConnector(env.REDIS_URL);

  const promptWorkflow = new PromptWorkflow(nats, litellm, presidioAnalyzer, presidioAnonymizer, opa, guardrails, otel);
  const moderationWorkflow = new ModerationWorkflow(nats);

  const enhancedWorkflow = new EnhancedPromptWorkflow(
    nats, litellm, presidioAnalyzer, presidioAnonymizer, opa, guardrails, otel,
    createDefaultRouter(), createDefaultRiskEngine(),
    createDefaultGovernanceEngine(), createDefaultComplianceEngine(),
  );

  return {
    litellm, presidioAnalyzer, presidioAnonymizer, opa, guardrails, otel, nats, redis,
    promptWorkflow, moderationWorkflow, enhancedWorkflow,
  };
}
