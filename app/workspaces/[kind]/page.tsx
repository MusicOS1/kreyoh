import { notFound } from 'next/navigation';
import WorkspaceDashboard from '../../../components/ecosystem/WorkspaceDashboard';
import { workspaceConfig } from '../../../lib/workspaceExperience';
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const config = workspaceConfig((await params).kind);
  if (!config || ['listener', 'admin'].includes(config.kind)) notFound();
  return <WorkspaceDashboard kind={config.kind} />;
}
