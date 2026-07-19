'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#e5e5e5' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', padding: '2rem 2.5rem' }}>
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
