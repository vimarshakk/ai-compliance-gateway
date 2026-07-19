'use client';

import { useQuery } from '@tanstack/react-query';
import { healthCheck } from '@/lib/api';
import { Circle } from 'lucide-react';

export function ServiceStatus() {
  const { data: services } = useQuery({
    queryKey: ['health'],
    queryFn: healthCheck,
    refetchInterval: 15_000,
    retry: 1,
  });

  const serviceNames: Record<string, string> = {
    litellm: 'LiteLLM',
    opa: 'OPA',
    guardrails: 'Guardrails',
    presidio: 'Presidio',
  };

  if (!services || Object.keys(services).length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Circle className="w-2 h-2 fill-gray-600" />
        <span>Checking...</span>
      </div>
    );
  }

  const allHealthy = Object.values(services).every(Boolean);

  return (
    <div className="flex items-center gap-3">
      {Object.entries(services).map(([name, healthy]) => (
        <div key={name} className="flex items-center gap-1 text-xs">
          <Circle className={`w-2 h-2 ${healthy ? 'fill-green-500' : 'fill-red-500'}`} />
          <span className={healthy ? 'text-gray-300' : 'text-red-400'}>{serviceNames[name] ?? name}</span>
        </div>
      ))}
    </div>
  );
}
