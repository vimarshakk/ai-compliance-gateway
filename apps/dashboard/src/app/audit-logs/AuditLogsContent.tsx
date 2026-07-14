'use client';

import { useQuery } from '@tanstack/react-query';
import { auditLogs, type AuditLog } from '@/lib/api';

export default function AuditLogsContent() {
  const { data, isLoading } = useQuery({ queryKey: ['auditLogs'], queryFn: () => auditLogs.list({ limit: 100 }) });
  const list: AuditLog[] = data?.auditLogs ?? [];

  return (
    <>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Audit Logs</h1>

      {isLoading ? <p style={{ color: '#666' }}>Loading…</p> : list.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: 4 }}>No audit logs yet.</p>
          <p style={{ color: '#444', fontSize: '0.75rem' }}>Activity will appear here as you create organizations, policies, and API keys.</p>
        </div>
      ) : (
        <div style={tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={th}>Timestamp</th><th style={th}>Action</th><th style={th}>Resource</th><th style={th}>Resource ID</th><th style={th}>User</th>
            </tr></thead>
            <tbody>{list.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ ...td, color: '#555', fontFamily: 'monospace', fontSize: '0.7rem' }}>{new Date(l.timestamp).toLocaleString()}</td>
                <td style={td}><code style={{ color: '#a78bfa' }}>{l.action}</code></td>
                <td style={td}>{l.resource}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.7rem', color: '#555' }}>{l.resourceId?.slice(0, 8) ?? '—'}</td>
                <td style={td}>{l.userId ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '0.6rem 1rem', color: '#666', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' };
const td: React.CSSProperties = { padding: '0.6rem 1rem', color: '#ccc' };
const tableWrap: React.CSSProperties = { background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden' };
