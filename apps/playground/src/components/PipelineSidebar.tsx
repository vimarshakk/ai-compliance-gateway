'use client';

import { usePlaygroundStore } from '@/lib/store';
import type { PipelineStep } from '@/lib/store';
import { CheckCircle, XCircle, Loader2, Clock, Shield, FileText, ShieldCheck, Route, Cpu, Filter, ScrollText } from 'lucide-react';

const STEP_ICONS: Record<string, any> = {
  'pii-detection': Shield,
  'policy-evaluation': FileText,
  'guardrails': ShieldCheck,
  'model-routing': Route,
  'llm-call': Cpu,
  'output-filter': Filter,
  'audit': ScrollText,
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  'pii-detection': 'Scans input for PII entities (name, email, phone, Aadhaar, PAN, etc.) using Microsoft Presidio.',
  'policy-evaluation': 'Evaluates request against OPA policies (HIPAA, PCI-DSS, DPDP, rate limits, RBAC).',
  'guardrails': 'Runs content through NeMo Guardrails for toxicity, hallucination, and jailbreak detection.',
  'model-routing': 'Routes to optimal model based on compliance requirements, cost, and availability.',
  'llm-call': 'Sends sanitized prompt to LLM provider via LiteLLM proxy.',
  'output-filter': 'Scans LLM output for PII leakage and policy violations before returning to client.',
  'audit': 'Writes immutable audit log entry with full pipeline trace.',
};

function statusColor(status: PipelineStep['status']) {
  switch (status) {
    case 'completed': return 'border-green-700 bg-green-900/20';
    case 'failed': return 'border-red-700 bg-red-900/20';
    case 'running': return 'border-blue-700 bg-blue-900/20';
    case 'skipped': return 'border-gray-700 bg-gray-800/20';
    default: return 'border-gray-800 bg-gray-900/20';
  }
}

function statusIcon(status: PipelineStep['status']) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'running': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    default: return <Clock className="w-4 h-4 text-gray-600" />;
  }
}

export function PipelineSidebar() {
  const { pipeline } = usePlaygroundStore();

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Pipeline</h3>

      {pipeline.length === 0 ? (
        <div className="text-center text-gray-600 text-sm py-8">
          Send a prompt to see the pipeline execute
        </div>
      ) : (
        <div className="space-y-2">
          {pipeline.map((step, i) => {
            const Icon = STEP_ICONS[step.id] ?? Clock;
            return (
              <div key={step.id} className={`border rounded-lg p-3 ${statusColor(step.status)}`}>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-mono">{i + 1}</span>
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium flex-1">{step.name}</span>
                  {statusIcon(step.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  {STEP_DESCRIPTIONS[step.id] ?? step.id}
                </p>
                {step.duration !== undefined && (
                  <p className="text-xs text-gray-500 mt-1 ml-7">{step.duration}ms</p>
                )}
                {step.error && (
                  <p className="text-xs text-red-400 mt-1 ml-7">{step.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
