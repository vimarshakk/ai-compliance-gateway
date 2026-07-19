'use client';

import { useQuery } from '@tanstack/react-query';
import { engines } from '@/lib/api';
import { useState } from 'react';

export default function ComplianceContent() {
  const { data: packsData, isLoading } = useQuery({ queryKey: ['engine-compliance-packs'], queryFn: () => engines.compliance.packs() });
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  const packs = packsData?.packs ?? [];

  const runEval = async (packId?: string) => {
    setEvaluating(true);
    try {
      const result = await engines.compliance.evaluate({
        organizationId: 'dashboard-test',
        model: 'gpt-4',
        provider: 'openai',
        messages: [{ role: 'user', content: 'Test compliance evaluation' }],
        piiDetected: [],
        dataFlow: 'internal',
        encryptionInTransit: true,
        encryptionAtRest: true,
        ...(packId ? { packId } : {}),
      });
      setEvalResult(result);
    } catch { setEvalResult(null); }
    setEvaluating(false);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Compliance Engine</h1>
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Regulatory compliance packs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => runEval()} disabled={evaluating} style={btnPrimary}>{evaluating ? 'Evaluating…' : 'Evaluate All Packs'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Compliance Packs ({packs.length})</h2>
          {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {packs.map((p: any) => (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>{p.fullName}</div>
                      <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 4 }}>
                        {p.ruleCount} rules · v{p.version}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: p.enabled ? '#0a2e1a' : '#1a1a1a', color: p.enabled ? '#4ade80' : '#666' }}>
                        {p.enabled ? 'ON' : 'OFF'}
                      </span>
                      <button onClick={() => runEval(p.id)} disabled={evaluating} style={{ background: 'none', border: '1px solid #333', borderRadius: 4, padding: '0.15rem 0.4rem', color: '#888', cursor: 'pointer', fontSize: '0.65rem' }}>
                        Test
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Evaluation Results</h2>
          {evalResult ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {(evalResult.reports ?? [evalResult.report]).filter(Boolean).map((r: any, i: number) => (
                <div key={i} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.packName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>
                        {r.passed} passed · {r.failed} failed · {r.warnings} warnings
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: r.overallStatus === 'compliant' ? '#4ade80' : r.overallStatus === 'partial' ? '#eab308' : '#ef4444' }}>
                        {r.score}%
                      </span>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                        background: r.overallStatus === 'compliant' ? '#0a2e1a' : r.overallStatus === 'partial' ? '#2e2a0a' : '#2e0a0a',
                        color: r.overallStatus === 'compliant' ? '#4ade80' : r.overallStatus === 'partial' ? '#eab308' : '#ef4444',
                      }}>
                        {r.overallStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={cardStyle}>
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Click "Evaluate All Packs" to test compliance against a sample request.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const cardStyle: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1rem 1.25rem' };
const btnPrimary: React.CSSProperties = { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', background: '#fff', color: '#000', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' };
