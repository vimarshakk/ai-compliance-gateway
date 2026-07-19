'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlaygroundStore } from '@/lib/store';
import { listModels } from '@/lib/api';
import { ChevronDown } from 'lucide-react';

const DEFAULT_MODELS = [
  { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini' },
  { id: 'claude-3.5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku' },
  { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash' },
];

export function ModelSelector() {
  const { selectedModel, selectedProvider, setSelectedModel, setSelectedProvider } = usePlaygroundStore();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listModels().then(setModels).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = models.find((m) => m.id === selectedModel && m.provider === selectedProvider) ?? models[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:border-gray-600 transition-colors"
      >
        <span className="text-gray-300">{current.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 text-xs text-gray-500 font-medium uppercase tracking-wider">Models</div>
          {models.map((model) => (
            <button
              key={`${model.provider}/${model.id}`}
              onClick={() => {
                setSelectedModel(model.id);
                setSelectedProvider(model.provider);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                model.id === selectedModel && model.provider === selectedProvider
                  ? 'bg-gray-700 text-blue-400'
                  : 'text-gray-200'
              }`}
            >
              <span>{model.name}</span>
              <span className="text-xs text-gray-500">{model.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
