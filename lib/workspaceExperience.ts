// Presentation preferences are never an authorization grant.
export type WorkspaceKind =
  | 'listener'
  | 'artist'
  | 'producer'
  | 'engineer'
  | 'ar'
  | 'visual'
  | 'manager'
  | 'coordinator'
  | 'creative'
  | 'studio'
  | 'admin';
export type WorkspaceOption = {
  kind: WorkspaceKind;
  label: string;
  href: string;
  description: string;
};
export type HeaderIdentity = {
  id: string;
  creator: boolean;
  name: string;
  avatar: string | null;
  workspaces: WorkspaceOption[];
  unread: number;
};
export type MembershipScope = { project_id: string; roles: string[] };
export type WorkspaceConfig = WorkspaceOption & {
  title: string;
  intro: string;
  focus: string;
  links: { label: string; href: string }[];
  identities: string[];
  assigned: string[];
  restricted?: boolean;
};
const tools = (entries: [string, string][]) =>
  entries.map(([label, href]) => ({ label, href }));
export const WORKSPACES: WorkspaceConfig[] = [
  {
    kind: 'listener',
    label: 'Listening room',
    href: '/fan',
    description: 'Discover, collect and listen',
    title: 'Find your frequency.',
    intro:
      'Independent sounds. The people behind them. A collection that is yours.',
    focus: 'Your music',
    identities: [],
    assigned: [],
    links: tools([
      ['Discover', '/fan'],
      ['Artists', '/fan?tab=Artists'],
      ['My library', '/fan?tab=My%20Library'],
      ['Billboard', '/billboard'],
      ['Messages', '/messages'],
    ]),
  },
  {
    kind: 'artist',
    label: 'Artist',
    href: '/workspaces/artist',
    description: 'Your music, collaborators and releases',
    title: 'Make your next move.',
    intro:
      'Your recordings, creative projects and the people building with you.',
    focus: 'My music',
    identities: ['Artist'],
    assigned: ['Artist'],
    links: tools([
      ['Overview', '/workspaces/artist'],
      ['My music', '/tracks'],
      ['Projects', '/projects'],
      ['Collaborations', '/people'],
      ['Credits & splits', '/splits'],
      ['Releases', '/billboard/submit'],
      ['My professional record', '/professional-record'],
      ['Opportunities', '/opportunities'],
    ]),
  },
  {
    kind: 'producer',
    label: 'Producer',
    href: '/workspaces/producer',
    description: 'Beats, productions and studio work',
    title: 'Build the sound.',
    intro:
      'Keep productions, sessions, stems and collaborators moving together.',
    focus: 'Beats & productions',
    identities: ['Producer', 'Beatmaker'],
    assigned: ['Producer'],
    links: tools([
      ['Overview', '/workspaces/producer'],
      ['Beats & productions', '/beats'],
      ['Active recordings', '/tracks'],
      ['Sessions', '/studio-sessions'],
      ['Stems & versions', '/tracks'],
      ['Production credits', '/professional-record'],
      ['Splits & agreements', '/splits'],
      ['Opportunities', '/opportunities'],
    ]),
  },
  {
    kind: 'engineer',
    label: 'Sound engineer',
    href: '/workspaces/engineer',
    description: 'Sessions, audio versions and delivery',
    title: 'Bring the record into focus.',
    intro:
      'Session recordings, mix versions, review notes and the next delivery.',
    focus: 'Sessions & versions',
    identities: [
      'Engineer',
      'Recording Engineer',
      'Mixing Engineer',
      'Mastering Engineer',
      'Technical',
    ],
    assigned: ['Engineer'],
    links: tools([
      ['Overview', '/workspaces/engineer'],
      ['Sessions', '/studio-sessions'],
      ['Active tracks', '/tracks'],
      ['Mix versions & stems', '/tracks'],
      ['Track records', '/track-records'],
      ['My deadlines', '/my-actions'],
      ['Engineering credits', '/professional-record'],
      ['Agreements', '/documents'],
    ]),
  },
  {
    kind: 'ar',
    label: 'A&R',
    href: '/workspaces/ar',
    description: 'Authorised repertoire review and development',
    title: 'Find what deserves to be heard.',
    intro:
      'Review repertoire, leave considered feedback and help the next record develop.',
    focus: 'Repertoire review',
    identities: [],
    assigned: ['A&R'],
    restricted: true,
    links: tools([
      ['Overview', '/workspaces/ar'],
      ['Artist discovery', '/discover?role=Artist'],
      ['Repertoire reviews', '/tracks'],
      ['Release readiness', '/track-records'],
      ['Development actions', '/tasks'],
      ['Review meetings', '/studio-sessions'],
      ['Project insights', '/portal/ar'],
      ['Opportunities', '/opportunities'],
    ]),
  },
  {
    kind: 'visual',
    label: 'Visual creative',
    href: '/workspaces/visual',
    description: 'Briefs, visual assets and deliverables',
    title: 'Give the music a visual world.',
    intro:
      'Project briefs, production actions and the media that tells the story.',
    focus: 'Creative production',
    identities: [
      'Videographer',
      'Photographer',
      'Designer',
      'Visual Creative',
      'Videographer / Photographer',
      'Designer / Visual Creative',
      'Creative Director',
      'Editor',
    ],
    assigned: ['Videographer', 'Photographer', 'Designer', 'Visual Creative'],
    links: tools([
      ['Overview', '/workspaces/visual'],
      ['Assigned projects', '/projects'],
      ['Creative briefs', '/documents?view=documents'],
      ['Production schedule', '/tasks'],
      ['Uploaded media', '/documents'],
      ['Feedback & revisions', '/tasks'],
      ['Visual credits', '/professional-record'],
      ['Agreements', '/documents'],
    ]),
  },
  {
    kind: 'manager',
    label: 'Manager & label',
    href: '/workspaces/manager',
    description: 'Explicit artist relationships and project coordination',
    title: 'Keep the people and the plan connected.',
    intro:
      'Coordinate the artists you are assigned to support, their projects and their next actions.',
    focus: 'Artists & planning',
    identities: [],
    assigned: ['Manager'],
    restricted: true,
    links: tools([
      ['Overview', '/workspaces/manager'],
      ['Represented artists', '/support-team'],
      ['Active projects', '/projects'],
      ['Release planning', '/track-records'],
      ['Schedules & milestones', '/tasks'],
      ['Credits & splits', '/splits'],
      ['Agreements', '/documents'],
      ['Project financial records', '/finance'],
      ['Project insights', '/portal/manager'],
    ]),
  },
  {
    kind: 'coordinator',
    label: 'Project coordination',
    href: '/workspaces/coordinator',
    description: 'Delivery, milestones and project administration',
    title: 'Turn the plan into progress.',
    intro:
      'One shared project, with clear next actions, accountable people and connected records.',
    focus: 'Project delivery',
    identities: [],
    assigned: ['Project Lead', 'Project Admin'],
    restricted: true,
    links: tools([
      ['Overview', '/workspaces/coordinator'],
      ['Manage project', '/workspace'],
      ['Projects', '/projects'],
      ['Tasks & milestones', '/tasks'],
      ['Team', '/people'],
      ['Sessions', '/studio-sessions'],
      ['Documents', '/documents'],
      ['Project financial records', '/finance'],
      ['Reports', '/reports'],
    ]),
  },
  {
    kind: 'creative',
    label: 'Creative workspace',
    href: '/workspaces/creative',
    description: 'Writing, contributions and shared creative work',
    title: 'Make your contribution count.',
    intro:
      'Writing, arranging, performing and collaborating — connected to the same projects.',
    focus: 'Creative work',
    identities: [
      'Songwriter',
      'Composer',
      'Session Musician',
      'Content',
      'Media',
      'Other Creative',
    ],
    assigned: [
      'Songwriter',
      'Composer',
      'Session Musician',
      'Contributor',
      'Viewer',
      'Finance',
    ],
    links: tools([
      ['Overview', '/workspaces/creative'],
      ['Projects', '/projects'],
      ['Recordings', '/tracks'],
      ['Sessions & contributions', '/studio-sessions'],
      ['My actions', '/my-actions'],
      ['Professional record', '/professional-record'],
      ['Credits & splits', '/splits'],
      ['Documents', '/documents'],
    ]),
  },
  {
    kind: 'studio',
    label: 'Studio operations',
    href: '/workspaces/studio',
    description: 'Studio sessions and production oversight',
    title: 'Keep the room moving.',
    intro:
      'Sessions, production files and follow-ups across the projects you can access.',
    focus: 'Studio operations',
    identities: [],
    assigned: ['Studio Owner'],
    restricted: true,
    links: tools([
      ['Overview', '/workspaces/studio'],
      ['Sessions', '/studio-sessions'],
      ['Production files', '/tracks'],
      ['Studio insights', '/portal/studio'],
      ['Documents', '/documents'],
      ['Follow-up actions', '/tasks'],
    ]),
  },
  {
    kind: 'admin',
    label: 'Control Room',
    href: '/admin',
    description: 'Server-authorised platform management',
    title: 'The whole ecosystem, in view.',
    intro: 'Manage the platform with explicit administrative permissions.',
    focus: 'Administration',
    identities: [],
    assigned: [],
    restricted: true,
    links: [],
  },
];
export const managementRoles = ['Super Admin', 'Admin', 'Project Lead'];
export const workspaceConfig = (kind: string) =>
  WORKSPACES.find((item) => item.kind === kind);
export function workspaceOptions(
  types: unknown,
  assigned: string[],
  admin = false,
): WorkspaceOption[] {
  const identities = Array.isArray(types)
    ? types.filter((value): value is string => typeof value === 'string')
    : [];
  const manager = assigned.some((role) =>
    ['Super Admin', 'Admin'].includes(role),
  );
  return WORKSPACES.filter(
    (item) =>
      item.kind === 'listener' ||
      (item.kind === 'admin'
        ? admin
        : item.identities.some((type) => identities.includes(type)) ||
          item.assigned.some((role) => assigned.includes(role)) ||
          (manager && item.kind === 'coordinator')),
  ).map(({ kind, label, href, description }) => ({
    kind,
    label,
    href,
    description,
  }));
}
export function permittedProjectIds(
  kind: WorkspaceKind,
  memberships: MembershipScope[],
): string[] {
  const config = workspaceConfig(kind);
  if (!config || kind === 'listener' || kind === 'admin') return [];
  return memberships
    .filter(
      (item) =>
        !config.restricted ||
        item.roles.some(
          (role) =>
            config.assigned.includes(role) || managementRoles.includes(role),
        ),
    )
    .map((item) => item.project_id);
}
export function preferredWorkspace(
  options: WorkspaceOption[],
  value?: string | null,
): WorkspaceOption {
  return (
    options.find((item) => item.kind === value && item.kind !== 'admin') ||
    options.find((item) => !['listener', 'admin'].includes(item.kind)) ||
    options[0]
  );
}

export function workspaceHref(href: string, kind: WorkspaceKind): string {
  if (['listener', 'admin'].includes(kind) || href.startsWith('/workspaces/'))
    return href;
  const url = new URL(href, 'https://fackts.invalid');
  url.searchParams.set('workspace', kind);
  return url.pathname + url.search + url.hash;
}
