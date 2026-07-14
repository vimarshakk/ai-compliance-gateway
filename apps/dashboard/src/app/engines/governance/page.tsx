export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import GovernanceContent from './GovernanceContent';

export default function GovernancePage() {
  return (
    <DashboardShell>
      <GovernanceContent />
    </DashboardShell>
  );
}
