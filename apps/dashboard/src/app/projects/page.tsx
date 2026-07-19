export const dynamic = 'force-dynamic';

import { DashboardShell } from '@/components/DashboardShell';
import ProjectsContent from './ProjectsContent';

export default function ProjectsPage() {
  return (
    <DashboardShell>
      <ProjectsContent />
    </DashboardShell>
  );
}
