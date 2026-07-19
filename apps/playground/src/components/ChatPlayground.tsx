'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlaygroundStore } from '@/lib/store';
import { chatCompletion, type CompletionResponse } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { PipelineVisualization } from './PipelineVisualization';
import { SettingsPanel } from './SettingsPanel';
import { Send, Loader2, Settings, Trash2 } from 'lucide-react';

export function ChatPlayground() {
  const {
    messages, addMessage, updateLastMessage, setPipeline,
    isRunning, setIsRunning, selectedModel, selectedProvider,
    systemPrompt, temperature, maxTokens, compliancePack,
    firewallEnabled, piiDetectionEnabled, clearMessages,
  } = usePlaygroundStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    setInput('');
    setIsRunning(true);

    // Add user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    // Add empty assistant message
    const assistantId = crypto.randomUUID();
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      provider: selectedProvider,
      timestamp: new Date(),
      pipeline: [],
    });

    // Set pipeline steps
    const steps = [
      { id: 'pii-detection', name: 'PII Detection', status: 'pending' as const },
      { id: 'policy-evaluation', name: 'Policy Evaluation', status: 'pending' as const },
      { id: 'guardrails', name: 'Guardrails', status: 'pending' as const },
      { id: 'model-routing', name: 'Model Routing', status: 'pending' as const },
      { id: 'llm-call', name: 'LLM Call', status: 'pending' as const },
      { id: 'output-filter', name: 'Output Filter', status: 'pending' as const },
      { id: 'audit', name: 'Audit Log', status: 'pending' as const },
    ];
    setPipeline(steps);

    const startTime = Date.now();

    try {
      const allMessages = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ];

      const response = await chatCompletion({
        model: selectedModel,
        provider: selectedProvider,
        messages: allMessages,
        temperature,
        maxTokens,
        compliancePack,
        firewallEnabled,
        piiDetectionEnabled,
      });

      const latencyMs = Date.now() - startTime;

      updateLastMessage({
        id: assistantId,
        content: response.choices?.[0]?.message?.content ?? 'No response',
        latencyMs,
        tokens: response.usage ? {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens,
        } : undefined,
        pipeline: steps.map((s) => ({ ...s, status: 'completed' as const })),
        compliance: response.compliance,
      });

      // Mark all pipeline steps as completed
      setPipeline(steps.map((s) => ({ ...s, status: 'completed' as const, duration: Math.floor(latencyMs / steps.length) })));
    } catch (error) {
      updateLastMessage({
        id: assistantId,
        content: '',
        error: (error as Error).message,
        pipeline: steps.map((s) => ({ ...s, status: 'failed' as const })),
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h2 className="text-lg font-medium mb-2">AI Compliance Gateway Playground</h2>
              <p className="text-sm max-w-md">
                Send a prompt to see PII detection, policy evaluation, guardrails, and model routing in real-time.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['Tell me about HIPAA compliance', 'Analyze patient data risks', 'What is DPDP Act?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={clearMessages}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a prompt... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder-gray-500"
              disabled={isRunning}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isRunning}
              className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span>Model: <span className="text-gray-300">{selectedProvider}/{selectedModel}</span></span>
          <span>Pack: <span className="text-gray-300">{compliancePack}</span></span>
          <span>Firewall: <span className={firewallEnabled ? 'text-green-400' : 'text-gray-500'}>{firewallEnabled ? 'ON' : 'OFF'}</span></span>
          <span>PII: <span className={piiDetectionEnabled ? 'text-green-400' : 'text-gray-500'}>{piiDetectionEnabled ? 'ON' : 'OFF'}</span></span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
