'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeys as keysApi, orgs, type ApiKey } from '@/lib/api';

export default function ApiKeysContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['apiKeys'], queryFn: () => keysApi.list() });
  const { data: orgData } = useQuery({ queryKey: ['orgs'], queryFn: () => orgs.list() });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => keysApi.create({ organizationId: orgId, name }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['apiKeys'] }); setNewKey((d as any).key); setShowForm(false); setName(''); setOrgId(''); },
    onError: (e: Error) => setError(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => keysApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });

  const list: ApiKey[] = data?.apiKeys ?? [];
  const orgList = orgData?.organizations ?? [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>API Keys</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>+ New</button>
      </div>

      {newKey && (
        <div style={{ background: '#111', border: '1px solid #22c55e44', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: 4, fontWeight: 600 }}>Key Created — copy it now, it won't be shown again.</div>
          <code style={{ fontSize: '0.8rem', color: '#a78bfa', wordBreak: 'break-all' }}>{newKey}</code>
        </div>
      )}

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} style={formStyle}>
          <Field label="Name" value={name} onChange={setName} placeholder="Production Key" />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Organization</span>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={input}>
              <option value="">Select org…</option>
              {orgList.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={createMut.isPending || !orgId} style={btnPrimary}>{createMut.isPending ? 'Creating…' : 'Create'}</button>
          <button type="button" onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
          {error && <div style={{ width: '100%', color: '#ef4444', fontSize: '0.75rem' }}>{error}</div>}
        </form>
      )}

      {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : list.length === 0 ? (
        <p style={{ color: '#666' }}>No API keys yet.</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={th}>Name</th><th style={th}>Prefix</th><th style={th}>Scopes</th><th style={th}>Created</th><th style={th}>Actions</th>
            </tr></thead>
            <tbody>{list.map((k) => (
              <tr key={k.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={td}>{k.name}</td>
                <td style={td}><code style={{ color: '#a78bfa' }}>{k.keyPrefix}…</code></td>
                <td style={td}>{k.scopes.join(', ')}</td>
                <td style={td}>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td style={td}>
                  <button onClick={() => revokeMut.mutate(k.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Revoke</button>
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
