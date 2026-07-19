export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import OrganizationsContent from './OrganizationsContent';

export default function OrganizationsPage() {
  return (
    <DashboardShell>
      <OrganizationsContent />
    </DashboardShell>
  );
}
