export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import EvaluationsContent from './EvaluationsContent';

export default function EvaluationsPage() {
  return (
    <DashboardShell>
      <EvaluationsContent />
    </DashboardShell>
  );
}
