export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import PoliciesContent from './PoliciesContent';

export default function PoliciesPage() {
  return (
    <DashboardShell>
      <PoliciesContent />
    </DashboardShell>
  );
}
