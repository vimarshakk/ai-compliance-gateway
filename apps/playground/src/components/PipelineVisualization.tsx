'use client';

import type { PipelineStep } from '@/lib/store';
import { CheckCircle, XCircle, Loader2, Clock, SkipForward } from 'lucide-react';

export function PipelineVisualization({ steps }: { steps: PipelineStep[] }) {
  const statusIcon = (status: PipelineStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'running': return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
      case 'skipped': return <SkipForward className="w-3.5 h-3.5 text-gray-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
            step.status === 'completed' ? 'bg-green-900/20 text-green-300' :
            step.status === 'failed' ? 'bg-red-900/20 text-red-300' :
            step.status === 'running' ? 'bg-blue-900/20 text-blue-300' :
            'bg-gray-800/50 text-gray-500'
          }`}>
            {statusIcon(step.status)}
            <span>{step.name}</span>
            {step.duration !== undefined && (
              <span className="text-gray-500">{step.duration}ms</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <span className="text-gray-700 mx-0.5">→</span>
          )}
        </div>
      ))}
    </div>
  );
}
