'use client';

import { useQuery } from '@tanstack/react-query';
import { engines } from '@/lib/api';

export default function RiskContent() {
  const { data: rulesData, isLoading: rulesLoading } = useQuery({ queryKey: ['engine-risk-rules'], queryFn: () => engines.risk.rules() });
  const { data: thresholdsData } = useQuery({ queryKey: ['engine-risk-thresholds'], queryFn: () => engines.risk.thresholds() });

  const rules = rulesData?.rules ?? [];
  const thresholds = thresholdsData?.thresholds ?? {};

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Risk Engine</h1>
        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Real-time risk scoring for AI requests</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Thresholds</h2>
          <div style={cardStyle}>
            {Object.entries(thresholds).map(([level, score]) => (
              <div key={level} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{level}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: level === 'critical' ? '#ef4444' : level === 'high' ? '#f97316' : level === 'medium' ? '#eab308' : '#4ade80' }}>
                  {String(score)}
                </span>
              </div>
            ))}
            {Object.keys(thresholds).length === 0 && <p style={{ color: '#666', fontSize: '0.8rem' }}>No thresholds set</p>}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Custom Rules</h2>
          <div style={cardStyle}>
            {rulesLoading ? <p style={{ color: '#666', fontSize: '0.8rem' }}>Loading…</p> : (
              rules.length > 0 ? rules.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{r.id}</span>
                    <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 8 }}>{r.dimension}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: r.enabled ? '#0a2e1a' : '#1a1a1a', color: r.enabled ? '#4ade80' : '#666' }}>
                    {r.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              )) : <p style={{ color: '#666', fontSize: '0.8rem' }}>No custom rules. All built-in rules active.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1rem 1.25rem',
};
