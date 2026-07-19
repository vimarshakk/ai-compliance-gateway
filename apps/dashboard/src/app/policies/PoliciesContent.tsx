'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policies as polApi, orgs, type Policy } from '@/lib/api';

const TYPES = ['rate-limit', 'pii-detection', 'content-filter', 'model-restriction', 'compliance', 'custom'];

export default function PoliciesContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['policies'], queryFn: () => polApi.list() });
  const { data: orgData } = useQuery({ queryKey: ['orgs'], queryFn: () => orgs.list() });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [orgId, setOrgId] = useState('');
  const [type, setType] = useState('pii-detection');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => polApi.create({ organizationId: orgId, name, description: desc, type, rules: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); setShowForm(false); reset(); },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (p: Policy) => polApi.update(p.id, { enabled: !p.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => polApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });

  const reset = () => { setName(''); setDesc(''); setOrgId(''); setType('pii-detection'); setError(''); };
  const list: Policy[] = data?.policies ?? [];
  const orgList = orgData?.organizations ?? [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Policies</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>+ New</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} style={formStyle}>
          <Field label="Name" value={name} onChange={setName} placeholder="PII Detection" />
          <Field label="Description" value={desc} onChange={setDesc} placeholder="Detects Aadhaar, PAN, etc." />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Organization</span>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={input}>
              <option value="">Select org…</option>
              {orgList.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button type="submit" disabled={createMut.isPending || !orgId} style={btnPrimary}>{createMut.isPending ? 'Creating…' : 'Create'}</button>
          <button type="button" onClick={() => { setShowForm(false); reset(); }} style={btnGhost}>Cancel</button>
          {error && <div style={{ width: '100%', color: '#ef4444', fontSize: '0.75rem' }}>{error}</div>}
        </form>
      )}

      {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : list.length === 0 ? (
        <p style={{ color: '#666' }}>No policies yet.</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={th}>Name</th><th style={th}>Type</th><th style={th}>Enabled</th><th style={th}>Priority</th><th style={th}>Actions</th>
            </tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={td}>{p.name}<div style={{ fontSize: '0.7rem', color: '#555' }}>{p.description}</div></td>
                <td style={td}><code style={{ color: '#a78bfa' }}>{p.type}</code></td>
                <td style={td}>
                  <button onClick={() => toggleMut.mutate(p)} style={{
                    background: p.enabled ? '#22c55e22' : '#333', color: p.enabled ? '#22c55e' : '#888',
                    border: `1px solid ${p.enabled ? '#22c55e44' : '#222'}`, borderRadius: 4, padding: '2px 8px',
                    fontSize: '0.7rem', cursor: 'pointer',
                  }}>{p.enabled ? 'ON' : 'OFF'}</button>
                </td>
                <td style={td}>{p.priority}</td>
                <td style={td}>
                  <button onClick={() => deleteMut.mutate(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
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

const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' };
const input: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #222', borderRadius: 4, padding: '0.4rem 0.6rem', color: '#e5e5e5', fontSize: '0.8rem', outline: 'none' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 1rem', color: '#666', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' };
const td: React.CSSProperties = { padding: '0.6rem 1rem', color: '#ccc' };
const btnPrimary: React.CSSProperties = { background: '#fff', color: '#000', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { background: 'transparent', color: '#888', border: '1px solid #222', borderRadius: 4, padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' };
const formStyle: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' };
const tableWrap: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden' };
