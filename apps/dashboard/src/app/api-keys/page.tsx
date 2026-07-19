export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import ApiKeysContent from './ApiKeysContent';

export default function ApiKeysPage() {
  return (
    <DashboardShell>
      <ApiKeysContent />
    </DashboardShell>
  );
}
