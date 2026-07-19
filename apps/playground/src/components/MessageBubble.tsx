'use client';

import type { PlaygroundMessage } from '@/lib/store';
import { PipelineVisualization } from './PipelineVisualization';
import { Clock, Coins, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export function MessageBubble({ message }: { message: PlaygroundMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : message.error
                ? 'bg-red-900/30 border border-red-800 text-red-200'
                : 'bg-gray-800 text-gray-100'
          }`}
        >
          {message.error ? (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-300">Error</p>
                <p className="text-red-200/80">{message.error}</p>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* Metadata */}
        {!isUser && !message.error && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {message.latencyMs !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {message.latencyMs}ms
              </span>
            )}
            {message.tokens && (
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                {message.tokens.total} tokens
              </span>
            )}
            {message.model && (
              <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                {message.model}
              </span>
            )}
          </div>
        )}

        {/* Compliance badges */}
        {!isUser && message.compliance && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.compliance.piiDetected?.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-800/50 rounded-full text-xs text-yellow-300 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                PII: {message.compliance.piiDetected.join(', ')}
              </span>
            )}
            {message.compliance.policyDecision && (
              <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                message.compliance.policyDecision === 'allow'
                  ? 'bg-green-900/30 border border-green-800/50 text-green-300'
                  : message.compliance.policyDecision === 'deny'
                    ? 'bg-red-900/30 border border-red-800/50 text-red-300'
                    : 'bg-yellow-900/30 border border-yellow-800/50 text-yellow-300'
              }`}>
                <CheckCircle className="w-3 h-3" />
                Policy: {message.compliance.policyDecision}
              </span>
            )}
            {message.compliance.guardrailTriggers?.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-900/30 border border-orange-800/50 rounded-full text-xs text-orange-300">
                Guardrails: {message.compliance.guardrailTriggers.length} triggered
              </span>
            )}
          </div>
        )}

        {/* Pipeline visualization */}
        {!isUser && message.pipeline && message.pipeline.length > 0 && (
          <div className="mt-3">
            <PipelineVisualization steps={message.pipeline} />
          </div>
        )}
      </div>
    </div>
  );
}
