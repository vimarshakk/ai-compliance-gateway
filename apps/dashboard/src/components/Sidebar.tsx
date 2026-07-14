'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Overview', icon: '◆' },
  { href: '/organizations', label: 'Organizations', icon: '◎' },
  { href: '/projects', label: 'Projects', icon: '◇' },
  { href: '/policies', label: 'Policies', icon: '◈' },
  { href: '/api-keys', label: 'API Keys', icon: '◉' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '◧' },
  { href: '/evaluations', label: 'Evaluations', icon: '◍' },
  { divider: true, label: 'Engines' },
  { href: '/engines/router', label: 'AI Router', icon: '⬡' },
  { href: '/engines/risk', label: 'Risk Engine', icon: '⬢' },
  { href: '/engines/governance', label: 'Governance', icon: '⬠' },
  { href: '/engines/compliance', label: 'Compliance', icon: '⬣' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside style={{
      width: 240, background: '#0f0f0f', borderRight: '1px solid #1a1a1a',
      display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e5e5e5', letterSpacing: '-0.02em' }}>
          ACG
        </div>
        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>
          Compliance Gateway
        </div>
      </div>
      <nav style={{ flex: 1, padding: '0.75rem 0' }}>
        {NAV.map((item, i) => {
          if ('divider' in item && item.divider) {
            return (
              <div key={`div-${i}`} style={{ padding: '0.75rem 1.25rem 0.25rem', fontSize: '0.65rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
            );
          }
          const href = 'href' in item ? item.href : '/';
          const label = 'label' in item ? item.label : '';
          const icon = 'icon' in item ? item.icon : '';
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 1.25rem', fontSize: '0.8rem', textDecoration: 'none',
              color: active ? '#fff' : '#888', background: active ? '#1a1a1a' : 'transparent',
              borderRight: active ? '2px solid #fff' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '0.75rem', width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1a1a1a', fontSize: '0.7rem', color: '#444' }}>
        v0.1.0
      </div>
    </aside>
  );
}
