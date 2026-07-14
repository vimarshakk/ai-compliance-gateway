'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providers, type AiProvider } from '@/lib/api';

export default function ProvidersContent() {
  const [certifiedFilter, setCertifiedFilter] = useState<boolean | undefined>(undefined);
  const [selected, setSelected] = useState<AiProvider | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['providers', certifiedFilter],
    queryFn: () => providers.list({ certified: certifiedFilter, limit: 100 }),
  });

  const list: AiProvider[] = data?.providers ?? [];

  const complianceFeatures = ['hipaa', 'gdpr', 'soc2', 'pci', 'dpdp', 'abdm'];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>AI Providers</h1>
          <p style={{ color: '#666', fontSize: '0.75rem' }}>Provider certification status and compliance feature matrix</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setCertifiedFilter(undefined)}
            style={{ ...filterBtn, background: certifiedFilter === undefined ? '#fff' : 'transparent', color: certifiedFilter === undefined ? '#000' : '#888' }}
          >All</button>
          <button
            onClick={() => setCertifiedFilter(true)}
            style={{ ...filterBtn, background: certifiedFilter === true ? '#22c55e' : 'transparent', color: certifiedFilter === true ? '#fff' : '#888' }}
          >Certified</button>
          <button
            onClick={() => setCertifiedFilter(false)}
            style={{ ...filterBtn, background: certifiedFilter === false ? '#ef4444' : 'transparent', color: certifiedFilter === false ? '#fff' : '#888' }}
          >Uncertified</button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#666' }}>Loading…</p>
      ) : error ? (
        <div style={card}>
          <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Failed to load providers. Admin API may not be running.</div>
        </div>
      ) : list.length === 0 ? (
        <div style={card}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔌</div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>No providers configured.</div>
            <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '0.5rem' }}>
              Providers are seeded when the database is initialized.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {list.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              style={{
                ...card,
                cursor: 'pointer',
                borderColor: selected?.id === p.id ? '#a78bfa' : '#1a1a1a',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</div>
                  <div style={{ color: '#666', fontSize: '0.7rem' }}>{p.company}</div>
                </div>
                <span style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 4,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  background: p.certified ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: p.certified ? '#22c55e' : '#ef4444',
                }}>
                  {p.certified ? '✓ Certified' : '✗ Not Certified'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {complianceFeatures.map((f) => {
                  const val = p.complianceFeatures?.[f];
                  return (
                    <span key={f} style={{
                      display: 'inline-block',
                      padding: '0.1rem 0.35rem',
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      background: val ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                      color: val ? '#22c55e' : '#444',
                    }}>
                      {f.toUpperCase()} {val ? '✓' : '—'}
                    </span>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#555' }}>
                <span>{p.models?.length ?? 0} models</span>
                <span>{p.supportedRegions?.length ?? 0} regions</span>
                <span>{p.apiStyle}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const filterBtn: React.CSSProperties = { border: '1px solid #222', borderRadius: 4, padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' };
const card: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '1rem', transition: 'border-color 0.15s' };
