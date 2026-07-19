'use client';

import { useQuery } from '@tanstack/react-query';
import { orgs, projects, policies, apiKeys, auditLogs } from '@/lib/api';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1.25rem 1.5rem', minWidth: 160 }}>
      <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

export default function OverviewContent() {
  const orgCount = useQuery({ queryKey: ['orgs'], queryFn: () => orgs.list() });
  const projCount = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() });
  const polCount = useQuery({ queryKey: ['policies'], queryFn: () => policies.list() });
  const keyCount = useQuery({ queryKey: ['apiKeys'], queryFn: () => apiKeys.list() });
  const logCount = useQuery({ queryKey: ['auditLogs'], queryFn: () => auditLogs.list({ limit: 0 }) });

  return (
    <>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Overview</h1>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Stat label="Organizations" value={orgCount.data?.total ?? '—'} />
        <Stat label="Projects" value={projCount.data?.total ?? '—'} />
        <Stat label="Policies" value={polCount.data?.total ?? '—'} />
        <Stat label="API Keys" value={keyCount.data?.total ?? '—'} />
        <Stat label="Audit Logs" value={logCount.data?.total ?? '—'} />
      </div>
    </>
  );
}
