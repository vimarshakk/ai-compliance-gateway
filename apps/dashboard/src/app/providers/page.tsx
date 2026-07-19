export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import ProvidersContent from './ProvidersContent';

export default function ProvidersPage() {
  return (
    <DashboardShell>
      <ProvidersContent />
    </DashboardShell>
  );
}
