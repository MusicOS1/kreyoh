import {loadProjectSessions} from "./sessionAccess";
import {readAllRows} from "./recordReads";
import { getWorkspace } from './workspace';
import { getExperienceIdentity } from './experienceIdentity';
import {
  permittedProjectIds,
  workspaceConfig,
  workspaceHref,
  type WorkspaceKind,
} from './workspaceExperience';
import { projectLink } from './navigation';
import { notFound } from 'next/navigation';
export type DashboardRow = {
  id: string;
  title: string;
  detail: string;
  status?: string;
  href: string;
  date?: string;
};
export type DashboardSection = {
  title: string;
  subtitle: string;
  href: string;
  rows: DashboardRow[];
  unavailable: boolean;
};
const first = (value: any) => (Array.isArray(value) ? value[0] : value);
const readable = (value: unknown) => String(value || '').replaceAll('_', ' ');
export async function loadWorkspaceDashboard(kind: WorkspaceKind) {
  const [workspace, identity] = await Promise.all([
    getWorkspace(),
    getExperienceIdentity(),
  ]);
  const config = workspaceConfig(kind);
  if (
    !config ||
    !identity.workspaces.some((item) => item.kind === kind) ||
    ['listener', 'admin'].includes(kind)
  )
    notFound();
  const permittedIds = permittedProjectIds(kind, workspace.memberships);
  const selectedId = (workspace.project as any)?.id;
  const projectIds = selectedId && permittedIds.includes(selectedId) ? [selectedId] : [];
  const { admin, supabase, user } = workspace;
  const empty = () =>
    Promise.resolve({
      data: [] as any[],
      error: null,
      count: 0 as number | null,
    });
  const scoped = (table: string, columns: string, order = 'created_at') => {
    if (!projectIds.length) return empty();
    const query=admin.from(table).select(columns,{count:'exact'}).in('project_id',projectIds);
    if (table==='project_assets') query.or(`visibility.in.(project,public),uploaded_by.eq.${user.id}`);
    return query.order(order,{ascending:false}).limit(6);
  };
  const [
    tracks,
    tasks,
    sessions,
    assets,
    documents,
    beats,
    releases,
    splits,
    relationships,
    notes,
    opportunities,
    followers,
  ] = await Promise.all([
    projectIds.length?readAllRows(()=>admin.from('tracks').select('id,project_id,working_title,track_code,development_status,status,updated_at').in('project_id',projectIds).order('created_at',{ascending:false}).order('id')):empty(),
    projectIds.length
      ? admin
          .from('project_tasks')
          .select('id,project_id,title,status,due_date', { count: 'exact' })
          .in('project_id', projectIds)
          .eq('assignee_id', user.id)
          .neq('status', 'done')
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(6)
      : empty(),
    Promise.all(projectIds.map(id=>loadProjectSessions(admin,id,user.id,workspace.memberships.find((m:any)=>m.project_id===id)?.roles||[]))).then(results=>({data:results.flatMap(r=>r.data||[]),error:results.find(r=>r.error)?.error,count:results.some(r=>r.error)?null:results.reduce((n,r)=>n+(r.count||0),0)})),
    projectIds.length
      ? kind === 'visual'
        ? admin
            .from('project_assets')
            .select(
              'id,project_id,entity_id,entity_type,file_name,mime_type,asset_kind,version_note,created_at',
              { count: 'exact' },
            )
            .in('project_id', projectIds)
            .or(`and(mime_type.like.image/%,or(visibility.in.(project,public),uploaded_by.eq.${user.id})),and(mime_type.like.video/%,or(visibility.in.(project,public),uploaded_by.eq.${user.id}))`)
            .order('created_at', { ascending: false })
            .limit(6)
        : scoped(
            'project_assets',
            'id,project_id,entity_id,entity_type,file_name,mime_type,asset_kind,version_note,created_at',
          )
      : empty(),
    scoped(
      'project_documents',
      'id,project_id,title,document_type,summary,created_at',
    ),
    kind === 'producer' && projectIds.length
      ? admin
          .from('beats')
          .select('id,project_id,title,status,bpm,musical_key', {
            count: 'exact',
          })
          .in('project_id', projectIds)
          .eq('producer_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6)
      : empty(),
    admin
      .from('music_releases')
      .select('id,title,status,release_at', { count: 'exact' })
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    projectIds.length
      ? admin
          .from('track_splits')
          .select('id,project_id,track_id,percentage,status', {
            count: 'exact',
          })
          .in('project_id', projectIds)
          .eq('contributor_id', user.id)
          .eq('status', 'awaiting_confirmation')
          .limit(6)
      : empty(),
    kind === 'manager' && projectIds.length
      ? admin
          .from('project_support_relationships')
          .select(
            'id,project_id,status,artist:profiles!project_support_relationships_artist_id_fkey(id,full_name,stage_name,nickname)',
            { count: 'exact' },
          )
          .in('project_id', projectIds)
          .eq('support_user_id', user.id)
          .eq('support_role', 'Manager')
          .eq('status', 'active')
          .limit(8)
      : empty(),
    kind === 'ar' && projectIds.length
      ? admin
          .from('comments')
          .select('id,project_id,entity_id,body,kind,created_at', {
            count: 'exact',
          })
          .in('project_id', projectIds)
          .eq('entity_type', 'track')
          .in('kind', ['ar_note', 'revision'])
          .order('created_at', { ascending: false })
          .limit(5)
      : empty(),
    projectIds.length
      ? admin
          .from('commercial_opportunities')
          .select(
            'id,project_id,organisation,opportunity_type,status,next_action',
            { count: 'exact' },
          )
          .in('project_id', projectIds)
          .eq('assigned_owner', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : empty(),
    kind === 'artist'
      ? admin
          .from('fan_music_library')
          .select('item_id', { head: true, count: 'exact' })
          .eq('kind', 'following')
          .eq('item_id', user.id)
      : empty(),
  ]);
  const publishedIds = (releases.data || [])
    .filter((row: any) => row.status === 'published')
    .map((row: any) => row.id);
  const feedback =
    kind === 'artist' && publishedIds.length
      ? await admin
          .from('music_release_comments')
          .select('id,release_id,body,created_at', { count: 'exact' })
          .in('release_id', publishedIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
      : { data: [], error: null };
  const projectName = (id: string) =>
    String(
      (workspace.activeProjects as any[]).find((item) => item?.id === id)
        ?.name || 'Project',
    );
  const link = (id: string, path: string) =>
    projectLink(id, workspaceHref(path, kind));
  const trackRows: DashboardRow[] = (tracks.data || []).map((row: any) => ({
    id: row.id,
    title: row.working_title,
    detail: `${row.track_code||''} · ${projectName(row.project_id)}`,
    status: readable(row.development_status || row.status),
    href: link(row.project_id, `/track-records/${row.id}`),
  }));
  const taskRows: DashboardRow[] = (tasks.data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    detail: projectName(row.project_id),
    status: readable(row.status),
    date: row.due_date,
    href: link(row.project_id, '/tasks'),
  }));
  const sessionRows: DashboardRow[] = (sessions.data || []).map((row: any) => ({
    id: row.id,
    title: first(row.tracks)?.working_title || 'Project session',
    detail: row.location || projectName(row.project_id),
    status: readable(row.status),
    date: row.starts_at,
    href: link(row.project_id, `/studio-sessions#session-${row.id}`),
  }));
  const assetRows: DashboardRow[] = (assets.data || [])
    .filter(
      (row: any) =>
        kind !== 'visual' || /^(image|video)\//.test(row.mime_type || ''),
    )
    .map((row: any) => ({
      id: row.id,
      title: row.file_name || 'Project asset',
      detail: row.version_note || projectName(row.project_id),
      status: readable(row.asset_kind || row.mime_type),
      href: link(
        row.project_id,
        row.entity_type === 'track' ? '/tracks' : '/documents',
      ),
    }));
  const documentRows: DashboardRow[] = (documents.data || []).map(
    (row: any) => ({
      id: row.id,
      title: row.title,
      detail: row.summary || projectName(row.project_id),
      status: readable(row.document_type),
      href: link(row.project_id, '/documents'),
    }),
  );
  const releaseRows: DashboardRow[] = (releases.data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    detail:
      row.status === 'published'
        ? 'Published on FACKTS Music'
        : 'Release preparation',
    status: readable(row.status),
    href:
      row.status === 'published' ? `/billboard/${row.id}` : '/billboard/submit',
  }));
  const beatRows: DashboardRow[] = (beats.data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    detail:
      [row.bpm ? `${row.bpm} BPM` : '', row.musical_key]
        .filter(Boolean)
        .join(' · ') || projectName(row.project_id),
    status: readable(row.status),
    href: link(row.project_id, '/beats'),
  }));
  const relationRows: DashboardRow[] = (relationships.data || []).map(
    (row: any) => {
      const artist = first(row.artist);
      return {
        id: row.id,
        title:
          artist?.stage_name ||
          artist?.nickname ||
          artist?.full_name ||
          'Assigned artist',
        detail: projectName(row.project_id),
        status: 'Active relationship',
        href: link(row.project_id, '/support-team'),
      };
    },
  );
  const noteRows: DashboardRow[] = (notes.data || []).map((row: any) => ({
    id: row.id,
    title: row.body,
    detail: projectName(row.project_id),
    status: readable(row.kind),
    href: link(row.project_id, '/tracks'),
  }));
  const oppRows: DashboardRow[] = (opportunities.data || []).map(
    (row: any) => ({
      id: row.id,
      title: row.organisation || readable(row.opportunity_type),
      detail: row.next_action || projectName(row.project_id),
      status: readable(row.status),
      href: link(row.project_id, '/opportunities'),
    }),
  );
  const section = (
    title: string,
    subtitle: string,
    href: string,
    rows: DashboardRow[],
    result: { error: unknown },
  ): DashboardSection => ({
    title,
    subtitle,
    href: workspaceHref(href, kind),
    rows,
    unavailable: Boolean(result.error),
  });
  const sections: DashboardSection[] = [
    section(
      'Needs your attention',
      'Actions assigned to you',
      '/my-actions',
      taskRows,
      tasks,
    ),
    kind === 'producer'
      ? section(
          'My beats & productions',
          'Productions linked to your user record',
          '/beats',
          beatRows,
          beats,
        )
      : kind === 'visual'
        ? section(
            'Creative briefs & documents',
            'The current project records',
            '/documents',
            documentRows,
            documents,
          )
        : kind === 'manager'
          ? section(
              'Artists I support',
              'Explicit active management relationships',
              '/support-team',
              relationRows,
              relationships,
            )
          : section(
              kind === 'ar'
                ? 'Repertoire in development'
                : 'Project recordings',
              'Music in the selected project',
              '/tracks',
              [],
              tracks,
            ),
    kind === 'visual'
      ? section(
          'Visual assets',
          'Recent project media · no inferred approval status',
          '/documents',
          assetRows,
          assets,
        )
      : kind === 'ar'
        ? section(
            'Feedback & revisions',
            'Recorded A&R notes and revision requests',
            '/tracks',
            noteRows,
            notes,
          )
        : section(
            'My sessions',
            'All sessions you are authorised to open, including past records',
            '/studio-sessions',
            sessionRows,
            sessions,
          ),
    kind === 'artist'
      ? section(
          'My releases',
          'Publication here is not external DSP distribution',
          '/billboard/submit',
          releaseRows,
          releases,
        )
      : kind === 'engineer' || kind === 'producer'
        ? section(
            'Audio versions & files',
            'Uploaded versions, with their recorded notes',
            '/tracks',
            assetRows,
            assets,
          )
        : section(
            'Assigned opportunities',
            'Actual records assigned to you',
            '/opportunities',
            oppRows,
            opportunities,
          ),
  ];
  if (kind === 'artist')
    sections.push(
      section(
        'Audience & community',
        followers.error
          ? 'Follower information temporarily unavailable'
          : `${followers.count ?? 0} followers on FACKTS Music · recent public feedback`,
        '/fan',
        (feedback.data || []).map((row: any) => ({
          id: row.id,
          title: row.body,
          detail: 'Public release conversation',
          href: `/billboard/${row.release_id}`,
          date: row.created_at,
        })),
        feedback,
      ),
    );
  const metrics = [
    {
      label: 'Permitted projects',
      value: permittedIds.length,
      href: '/projects',
    },
    {
      label: 'My open actions',
      value: tasks.error ? null : tasks.count,
      href: '/my-actions',
    },
    {
      label: 'Splits awaiting me',
      value: splits.error ? null : splits.count,
      href: '/splits?view=mine',
    },
    {
      label: kind === 'artist' ? 'My releases' : 'My sessions',
      value:
        kind === 'artist'
          ? releases.error
            ? null
            : releases.count
          : sessions.error
            ? null
            : sessions.count,
      href: kind === 'artist' ? '/billboard/submit' : '/studio-sessions',
    },
  ];
  return {
    config,
    identity,
    projectIds,
    sections,
    metrics,
    trackRows,tracksUnavailable:Boolean(tracks.error),
    projects: (workspace.activeProjects as any[]).filter((project) =>
      projectIds.includes(project?.id),
    ),
    profile: workspace.profile,
  };
}
