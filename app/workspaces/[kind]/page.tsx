import { notFound } from 'next/navigation';
import WorkspaceDashboard from '../../../components/ecosystem/WorkspaceDashboard';
import { workspaceConfig } from '../../../lib/workspaceExperience';
export default async function WorkspacePage({
  params, searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const config = workspaceConfig((await params).kind);
  const requested=(await searchParams).period;
  const insightDays:7|30|90=requested==="7"?7:requested==="90"?90:30;
  if (!config || ['listener', 'admin'].includes(config.kind)) notFound();
  return <WorkspaceDashboard kind={config.kind} insightDays={insightDays} />;
}
