'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgs, type Organization } from '@/lib/api';

export default function OrganizationsContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['orgs'], queryFn: () => orgs.list() });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [pack, setPack] = useState('');
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: () => orgs.create({ name, slug, compliancePack: pack || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgs'] }); setShowForm(false); setName(''); setSlug(''); setPack(''); setError(''); },
    onError: (e: Error) => setError(e.message),
  });

  const list: Organization[] = data?.organizations ?? [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Organizations</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>+ New</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} style={formStyle}>
          <Field label="Name" value={name} onChange={setName} placeholder="Acme Corp" />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="acme-corp" />
          <Field label="Compliance Pack" value={pack} onChange={setPack} placeholder="india-healthcare" />
          <button type="submit" disabled={createMut.isPending} style={btnPrimary}>{createMut.isPending ? 'Creating…' : 'Create'}</button>
          <button type="button" onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
          {error && <div style={{ width: '100%', color: '#ef4444', fontSize: '0.75rem' }}>{error}</div>}
        </form>
      )}

      {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : list.length === 0 ? (
        <p style={{ color: '#666' }}>No organizations yet.</p>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={th}>Name</th><th style={th}>Slug</th><th style={th}>Packs</th><th style={th}>Created</th><th style={th}>ID</th>
            </tr></thead>
            <tbody>{list.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={td}>{o.name}</td>
                <td style={td}><code style={{ color: '#a78bfa' }}>{o.slug}</code></td>
                <td style={td}>{o.compliancePacks.join(', ') || '—'}</td>
                <td style={td}>{new Date(o.createdAt).toLocaleDateString()}</td>
                <td style={{ ...td, color: '#555', fontFamily: 'monospace', fontSize: '0.7rem' }}>{o.id.slice(0, 8)}…</td>
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
