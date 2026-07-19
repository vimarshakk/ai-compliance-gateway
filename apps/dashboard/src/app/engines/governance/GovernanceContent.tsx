'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engines } from '@/lib/api';
import { useState } from 'react';

export default function GovernanceContent() {
  const qc = useQueryClient();
  const { data: policiesData, isLoading } = useQuery({ queryKey: ['engine-gov-policies'], queryFn: () => engines.governance.policies() });
  const { data: approvalsData } = useQuery({ queryKey: ['engine-gov-approvals'], queryFn: () => engines.governance.approvals() });
  const { data: auditData } = useQuery({ queryKey: ['engine-gov-audit'], queryFn: () => engines.governance.auditLog() });

  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState('');
  const [policyName, setPolicyName] = useState('');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => engines.governance.createPolicy({
      id: policyId, name: policyName, enabled: true, priority: 50,
      conditions: [], actions: [{ type: 'allow' }],
      effectiveFrom: new Date().toISOString(), createdBy: 'dashboard', updatedBy: 'dashboard',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['engine-gov-policies'] }); setShowForm(false); setPolicyId(''); setPolicyName(''); },
    onError: (e: Error) => setError(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => engines.governance.removePolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engine-gov-policies'] }),
  });

  const policies = policiesData?.policies ?? [];
  const approvals = approvalsData?.approvals ?? [];
  const auditLog = auditData?.entries ?? [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Governance Engine</h1>
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Policy-as-code with approval workflows</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>+ New Policy</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} style={formStyle}>
          {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: 8 }}>{error}</div>}
          <Field label="Policy ID" value={policyId} onChange={setPolicyId} placeholder="gov-custom-001" />
          <Field label="Name" value={policyName} onChange={setPolicyName} placeholder="Custom Policy" />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={btnPrimary}>Create</button>
            <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Policies ({policies.length})</h2>
          {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {policies.map((p: any) => (
                <div key={p.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>{p.description}</div>
                      <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 4 }}>
                        {p.conditionCount} conditions · {p.actionCount} actions · Priority {p.priority}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: p.enabled ? '#0a2e1a' : '#1a1a1a', color: p.enabled ? '#4ade80' : '#666' }}>
                        {p.enabled ? 'ON' : 'OFF'}
                      </span>
                      <button onClick={() => removeMut.mutate(p.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: '#aaa' }}>Pending Approvals ({approvals.length})</h2>
          <div style={cardStyle}>
            {approvals.length > 0 ? approvals.map((a: any, i: number) => (
              <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{a.model} via {a.provider}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>User: {a.userId} · Risk: {a.riskScore}</div>
              </div>
            )) : <p style={{ color: '#666', fontSize: '0.8rem' }}>No pending approvals</p>}
          </div>

          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: '1.5rem', color: '#aaa' }}>Recent Audit ({auditLog.length})</h2>
          <div style={cardStyle}>
            {auditLog.length > 0 ? auditLog.slice(0, 5).map((e: any, i: number) => (
              <div key={i} style={{ padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: '0.75rem' }}>{e.action} — {e.policyId}</div>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>{new Date(e.timestamp).toLocaleString()}</div>
              </div>
            )) : <p style={{ color: '#666', fontSize: '0.8rem' }}>No audit entries</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={labelStyle}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={input} />
    </label>
  );
}

const cardStyle: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1rem 1.25rem' };
const formStyle: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#888', fontWeight: 500 };
const input: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#e5e5e5', fontSize: '0.8rem', outline: 'none' };
const btnPrimary: React.CSSProperties = { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', background: '#fff', color: '#000', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid #333', background: 'transparent', color: '#ccc', fontSize: '0.75rem', cursor: 'pointer' };
