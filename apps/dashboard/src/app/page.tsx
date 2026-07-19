export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import OverviewContent from './OverviewContent';

export default function Home() {
  return (
    <DashboardShell>
      <OverviewContent />
    </DashboardShell>
  );
}
