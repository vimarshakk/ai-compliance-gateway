'use client';

import { usePlaygroundStore } from '@/lib/store';
import { X } from 'lucide-react';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const {
    systemPrompt, setSystemPrompt,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    compliancePack, setCompliancePack,
    firewallEnabled, setFirewallEnabled,
    piiDetectionEnabled, setPiiDetectionEnabled,
  } = usePlaygroundStore();

  return (
    <div className="absolute right-0 top-12 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Settings</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* System Prompt */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Max Tokens: {maxTokens}
          </label>
          <input
            type="range"
            min="256"
            max="8192"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Compliance Pack */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Compliance Pack</label>
          <select
            value={compliancePack}
            onChange={(e) => setCompliancePack(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="default">Default</option>
            <option value="healthcare">Healthcare (HIPAA)</option>
            <option value="finance">Finance (PCI-DSS)</option>
            <option value="india">India (DPDP)</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <Toggle
            label="PII Detection"
            description="Scan input/output for personally identifiable information"
            enabled={piiDetectionEnabled}
            onChange={setPiiDetectionEnabled}
          />
          <Toggle
            label="Content Firewall"
            description="Evaluate against compliance policies before and after LLM call"
            enabled={firewallEnabled}
            onChange={setFirewallEnabled}
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label, description, enabled, onChange,
}: {
  label: string; description: string; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          enabled ? 'bg-blue-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
