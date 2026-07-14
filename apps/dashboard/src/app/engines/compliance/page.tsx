export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import ComplianceContent from './ComplianceContent';

export default function CompliancePage() {
  return (
    <DashboardShell>
      <ComplianceContent />
    </DashboardShell>
  );
}
