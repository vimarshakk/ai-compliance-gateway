'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engines } from '@/lib/api';

export default function RouterContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['engine-router'], queryFn: () => engines.router.health(), refetchInterval: 10000 });
  const resetMut = useMutation({
    mutationFn: () => engines.router.resetBreakers(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engine-router'] }),
  });

  const providers = data?.providers ?? [];
  const status = data?.status ?? 'unknown';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Router</h1>
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Intelligent model/provider routing</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
            background: status === 'healthy' ? '#0a2e1a' : '#2e1a0a',
            color: status === 'healthy' ? '#4ade80' : '#f97316',
          }}>
            {status.toUpperCase()}
          </span>
          <button onClick={() => resetMut.mutate()} style={btnSecondary}>Reset Breakers</button>
        </div>
      </div>

      {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {providers.map((p: any) => (
            <div key={p.provider} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.provider}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                    Failures: {p.failureCount} · Requests in window: {p.usageInWindow}
                  </div>
                </div>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: p.healthy ? '#4ade80' : '#ef4444',
                }} />
              </div>
            </div>
          ))}
          {providers.length === 0 && <p style={{ color: '#666' }}>No providers configured</p>}
        </div>
      )}
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1rem 1.25rem',
};
const btnSecondary: React.CSSProperties = {
  padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid #333', background: 'transparent',
  color: '#ccc', fontSize: '0.75rem', cursor: 'pointer',
};
