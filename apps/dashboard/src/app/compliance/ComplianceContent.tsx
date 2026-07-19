'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complianceScores, type ComplianceScore } from '@/lib/api';

export default function ComplianceContent() {
  const [orgFilter, setOrgFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['compliance-scores', orgFilter],
    queryFn: () => complianceScores.list({ organizationId: orgFilter || undefined, limit: 100 }),
  });

  const scores: ComplianceScore[] = data?.scores ?? [];

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreBg = (pct: number) => {
    if (pct >= 80) return 'rgba(34,197,94,0.1)';
    if (pct >= 60) return 'rgba(245,158,11,0.1)';
    return 'rgba(239,68,68,0.1)';
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>Compliance Scores</h1>
          <p style={{ color: '#666', fontSize: '0.75rem' }}>Historical compliance score tracking and trend analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            placeholder="Filter by org ID…"
            style={input}
          />
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#666' }}>Loading…</p>
      ) : error ? (
        <div style={card}>
          <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Failed to load compliance scores. Admin API may not be running.</div>
        </div>
      ) : scores.length === 0 ? (
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>No compliance scores recorded yet.</div>
            <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '0.5rem' }}>
              Run <code style={{ color: '#a78bfa' }}>acg score --save</code> from the CLI to record your first score.
            </div>
          </div>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                <th style={th}>Score</th>
                <th style={th}>Percentage</th>
                <th style={th}>Pack</th>
                <th style={th}>Organization</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block',
                      background: getScoreBg(s.percentage),
                      color: getScoreColor(s.percentage),
                      padding: '0.2rem 0.6rem',
                      borderRadius: 4,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}>
                      {s.overallScore}/{s.maxScore}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 60, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(s.percentage, 100)}%`,
                          height: '100%',
                          background: getScoreColor(s.percentage),
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ color: getScoreColor(s.percentage) }}>{s.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={td}>
                    {s.pack ? (
                      <code style={{ color: '#a78bfa', fontSize: '0.75rem' }}>{s.pack}</code>
                    ) : (
                      <span style={{ color: '#555' }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    <code style={{ color: '#888', fontSize: '0.7rem' }}>{s.organizationId.slice(0, 12)}…</code>
                  </td>
                  <td style={{ ...td, color: '#666' }}>
                    {new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const input: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 4, padding: '0.4rem 0.6rem', color: '#e5e5e5', fontSize: '0.8rem', outline: 'none', width: 220 };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 1rem', color: '#666', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' };
const td: React.CSSProperties = { padding: '0.6rem 1rem', color: '#ccc' };
const card: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1.25rem' };
const tableWrap: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden' };
