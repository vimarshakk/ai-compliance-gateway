import { BaseConnector } from './base.js';
import type { PIIDetectorConnector, PIIAnonymizerConnector } from '../interfaces/index.js';

const EMPTY_PII_RESULT: Array<{ entity_type: string; start: number; end: number; score: number; text: string }> = [];

export class PresidioAnalyzerConnector extends BaseConnector implements PIIDetectorConnector {
  constructor(baseUrl: string) {
    super('presidio-analyzer', baseUrl, 15000);
  }

  async analyze(params: { text: string; language?: string; entities?: string[]; scoreThreshold?: number }) {
    return this.requestGraceful('POST', '/analyze', EMPTY_PII_RESULT, {
      text: params.text,
      language: params.language ?? 'en',
      entities: params.entities,
      score_threshold: params.scoreThreshold ?? 0.5,
    });
  }
}

export class PresidioAnonymizerConnector extends BaseConnector implements PIIAnonymizerConnector {
  constructor(baseUrl: string) {
    super('presidio-anonymizer', baseUrl, 15000);
  }

  async anonymize(params: { text: string; analyzer_results: Array<{ entity_type: string; start: number; end: number; score: number }>; operator: string }) {
    return this.requestGraceful<{ text: string }>('POST', '/anonymize', { text: params.text }, {
      text: params.text,
      analyzer_results: params.analyzer_results,
      operators: { DEFAULT: { operator: params.operator } },
    });
  }
}
