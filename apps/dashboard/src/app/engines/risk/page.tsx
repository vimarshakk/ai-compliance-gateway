export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import RiskContent from './RiskContent';

export default function RiskPage() {
  return (
    <DashboardShell>
      <RiskContent />
    </DashboardShell>
  );
}
