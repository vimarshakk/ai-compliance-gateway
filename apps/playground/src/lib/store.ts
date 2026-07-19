import { create } from 'zustand';
import type { ChatMessage } from '@acg/shared';

export interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface PlaygroundMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
  pipeline?: PipelineStep[];
  latencyMs?: number;
  tokens?: { prompt: number; completion: number; total: number };
  cost?: number;
  compliance?: {
    piiDetected: string[];
    policyDecision: 'allow' | 'deny' | 'flag';
    guardrailTriggers: string[];
    riskScore: number;
  };
  timestamp: Date;
  error?: string;
}

interface PlaygroundState {
  messages: PlaygroundMessage[];
  pipeline: PipelineStep[];
  selectedModel: string;
  selectedProvider: string;
  isStreaming: boolean;
  isRunning: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  compliancePack: string;
  firewallEnabled: boolean;
  piiDetectionEnabled: boolean;

  // Actions
  addMessage: (msg: PlaygroundMessage) => void;
  updateLastMessage: (updates: Partial<PlaygroundMessage>) => void;
  setPipeline: (steps: PipelineStep[]) => void;
  updatePipelineStep: (stepId: string, updates: Partial<PipelineStep>) => void;
  setSelectedModel: (model: string) => void;
  setSelectedProvider: (provider: string) => void;
  setIsStreaming: (v: boolean) => void;
  setIsRunning: (v: boolean) => void;
  setSystemPrompt: (v: string) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setCompliancePack: (v: string) => void;
  setFirewallEnabled: (v: boolean) => void;
  setPiiDetectionEnabled: (v: boolean) => void;
  clearMessages: () => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  messages: [],
  pipeline: [],
  selectedModel: 'gpt-4o',
  selectedProvider: 'openai',
  isStreaming: false,
  isRunning: false,
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  maxTokens: 2048,
  compliancePack: 'default',
  firewallEnabled: true,
  piiDetectionEnabled: true,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (updates) =>
    set((s) => ({
      messages: s.messages.map((m, i) => (i === s.messages.length - 1 ? { ...m, ...updates } : m)),
    })),
  setPipeline: (steps) => set({ pipeline: steps }),
  updatePipelineStep: (stepId, updates) =>
    set((s) => ({
      pipeline: s.pipeline.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setIsRunning: (v) => set({ isRunning: v }),
  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setTemperature: (v) => set({ temperature: v }),
  setMaxTokens: (v) => set({ maxTokens: v }),
  setCompliancePack: (v) => set({ compliancePack: v }),
  setFirewallEnabled: (v) => set({ firewallEnabled: v }),
  setPiiDetectionEnabled: (v) => set({ piiDetectionEnabled: v }),
  clearMessages: () => set({ messages: [], pipeline: [] }),
}));
