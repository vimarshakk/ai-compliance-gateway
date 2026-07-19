export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import RouterContent from './RouterContent';

export default function RouterPage() {
  return (
    <DashboardShell>
      <RouterContent />
    </DashboardShell>
  );
}
