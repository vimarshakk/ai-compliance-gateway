export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import AuditLogsContent from './AuditLogsContent';

export default function AuditLogsPage() {
  return (
    <DashboardShell>
      <AuditLogsContent />
    </DashboardShell>
  );
}
