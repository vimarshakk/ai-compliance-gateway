'use client';

import { useQuery } from '@tanstack/react-query';
import { analytics } from '@/lib/api';

export default function EvaluationsContent() {
  const usage = useQuery({ queryKey: ['usage'], queryFn: () => analytics.usage() });
  const compliance = useQuery({ queryKey: ['compliance'], queryFn: () => analytics.compliance() });

  return (
    <>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Evaluations</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card title="Usage Analytics" loading={usage.isLoading} error={usage.error} data={usage.data} />
        <Card title="Compliance Analytics" loading={compliance.isLoading} error={compliance.error} data={compliance.data} />
      </div>

      <div style={{ marginTop: '1.5rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#666', marginBottom: 4 }}>Evaluation runner coming soon.</p>
        <p style={{ color: '#444', fontSize: '0.75rem' }}>Compare model performance, run compliance benchmarks, and track quality metrics.</p>
      </div>
    </>
  );
}

function Card({ title, loading, error, data }: { title: string; loading: boolean; error: Error | null; data: unknown }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>{title}</div>
      {loading ? <p style={{ color: '#555', fontSize: '0.8rem' }}>Loading…</p> :
       error ? <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>Failed to load</p> :
       data ? <pre style={{ fontSize: '0.7rem', color: '#a78bfa', overflow: 'auto', maxHeight: 200 }}>{JSON.stringify(data, null, 2)}</pre> :
       <p style={{ color: '#555', fontSize: '0.8rem' }}>No data</p>}
    </div>
  );
}
