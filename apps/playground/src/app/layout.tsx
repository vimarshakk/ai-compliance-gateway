import type { Metadata } from 'next';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ACG Playground — AI Compliance Gateway',
  description: 'Interactive prompt testing with real-time PII detection, policy evaluation, guardrails, and model routing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
