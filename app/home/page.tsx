import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { selectProject } from "../projects/actions";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
const readable = (value: string | null | undefined) => String(value || "Update").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());

export default async function PlatformHomePage() {
  const { user, profile, admin, activeProjects } = await getWorkspace();
  const projectIds = (activeProjects || []).map((project: any) => project.id);
  const now = new Date().toISOString();

  const [membershipsResult, tasksResult, sessionsResult, notificationsResult, invitationsResult, activityResult, roundsResult, milestonesResult, creatorsResult] = await Promise.all([
    admin.from("project_members").select("id,project_id,projects(*),member_roles(roles(name))").eq("user_id", user.id).eq("status", "active"),
    admin.from("project_tasks").select("id,title,status,due_date,project_id,projects(name)").eq("assignee_id", user.id).neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(6),
    projectIds.length ? admin.from("studio_sessions").select("id,starts_at,status,location,project_id,projects(name)").in("project_id", projectIds).gte("starts_at", now).neq("status", "cancelled").order("starts_at", { ascending: true }).limit(5) : Promise.resolve({ data: [] }),
    admin.from("notifications").select("id,title,body,type,project_id,entity_type,entity_id,read_at,created_at").eq("user_id", user.id).is("read_at", null).order("created_at", { ascending: false }).limit(6),
    admin.from("project_invitations").select("id,projects(name),roles(name)").eq("user_id", user.id).eq("status", "pending").limit(5),
    projectIds.length ? admin.from("activity_log").select("id,action,created_at,project_id,projects(name),profiles(full_name,stage_name)").in("project_id", projectIds).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    projectIds.length ? admin.from("track_voting_rounds").select("id,project_id,status,title").in("project_id", projectIds).eq("status", "open") : Promise.resolve({ data: [] }),
    projectIds.length ? admin.from("project_milestones").select("id,project_id,title,status,position").in("project_id", projectIds).in("status", ["in_progress","blocked","needs_attention"]).order("position", { ascending: true }).limit(12) : Promise.resolve({ data: [] }),
    admin.from("profiles").select("id,stage_name,avatar_url,bio,location,creator_types,public_slug").order("stage_name", { ascending: true, nullsFirst: false }).limit(100),
  ]);

  const memberships = membershipsResult.data || [];
  const tasks = tasksResult.data || [];
  const sessions = sessionsResult.data || [];
  const notifications = notificationsResult.data || [];
  const invitations = invitationsResult.data || [];
  const activity = activityResult.data || [];
  const rounds = roundsResult.data || [];
  const milestones = milestonesResult.data || [];
  const creators = creatorsResult.data || [];
  const name = creatorDisplayName(profile) || user.email?.split("@")[0] || "Creator";

  return <AppShell><div className="content platform-home-page">
    <section className="platform-home-hero">
      <div><span className="eyebrow">FACKTS MUSIC HOME</span><h1>Welcome back, {name}.</h1><p>Your projects, decisions and next moves—without losing the music inside the system.</p></div>
      <div className="platform-home-hero-actions"><Link href="/projects" className="login-submit-btn">My Projects</Link><Link href="/projects#start-project" className="secondary-button-inline">+ Start Project</Link></div>
    </section>

    <section className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>What needs to move</h2></div><Link href="/notifications">All notifications →</Link></div>
      <div className="attention-grid">
        <Link href="/tasks" className="attention-card"><strong>{tasks.length}</strong><span>Open assignment{tasks.length === 1 ? "" : "s"}</span></Link>
        <Link href="/studio-sessions" className="attention-card"><strong>{sessions.length}</strong><span>Upcoming session{sessions.length === 1 ? "" : "s"}</span></Link>
        <Link href="/tracks" className="attention-card"><strong>{rounds.length}</strong><span>Voting round{rounds.length === 1 ? "" : "s"} open</span></Link>
        <Link href="/invitations" className="attention-card"><strong>{invitations.length}</strong><span>Project invitation{invitations.length === 1 ? "" : "s"}</span></Link>
        <Link href="/notifications" className="attention-card"><strong>{notifications.length}</strong><span>Unread signal{notifications.length === 1 ? "" : "s"}</span></Link>
      </div>
    </section>

    <section className="platform-home-section creator-network-section">
      <div className="platform-section-heading"><div><span className="eyebrow">THE CREATIVE NETWORK</span><h2>People building inside FACKTS Music</h2></div><Link href="/discover">Open directory →</Link></div>
      <div className="home-creator-grid">{creators.length === 0 && <p className="home-empty-copy">Creator profiles will appear here.</p>}{creators.map((creator: any) => { const creatorName = creator.stage_name || "FACKTS Creator"; return <Link href={`/people/${creator.id}`} className="home-creator-card" key={creator.id}><span className="home-creator-avatar">{creator.avatar_url ? <img src={creator.avatar_url} alt="" /> : creatorName.slice(0,2).toUpperCase()}</span><span><strong>{creatorName}</strong><small>{(creator.creator_types || []).join(" · ") || "Creator"}{creator.location ? ` · ${creator.location}` : ""}</small></span><b>View →</b></Link>; })}</div>
    </section>
    <section className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">MY PROJECTS</span><h2>The rooms you are building in</h2></div><Link href="/projects">View all →</Link></div>
      <div className="home-project-grid">{memberships.length === 0 && <article className="panel empty-state"><h2>No active projects yet</h2><p>Accept an invitation, request access, or start your own project.</p><Link href="/projects" className="login-submit-btn">Open My Projects</Link></article>}{memberships.map((membership: any) => { const project = first(membership.projects) || {}; const roleNames = (membership.member_roles || []).map((row: any) => first(row.roles)?.name).filter(Boolean); const nextMilestone = milestones.find((item: any) => item.project_id === project.id); const votingOpen = rounds.some((round: any) => round.project_id === project.id); return <article className="home-project-card" key={membership.id}>
        <div className="home-project-art" style={project.artwork_url ? { backgroundImage: `linear-gradient(180deg,rgba(3,8,15,.08),rgba(3,8,15,.92)),url(${project.artwork_url})` } : undefined}><span>{project.code || "PROJECT"}</span></div>
        <div className="home-project-copy"><span className="eyebrow">{project.project_type || "MUSIC PROJECT"}</span><h3>{project.name}</h3><div className="project-stage-pill">{project.current_stage || (project.code === "PROJECT 001" ? "Development / Production" : "Project Setup")}</div><p><strong>Next:</strong> {project.next_action || nextMilestone?.title || "Set the next project action"}</p><div className="project-card-meta"><span>{roleNames.join(" · ") || "Project member"}</span>{votingOpen && <span>Voting open</span>}</div><form action={selectProject}><input type="hidden" name="project_id" value={project.id}/><button>Enter project →</button></form></div>
      </article>; })}</div>
    </section>

    <section className="platform-home-split">
      <article className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">UPCOMING</span><h2>Sessions</h2></div><Link href="/studio-sessions">Open studio →</Link></div><div className="home-list">{sessions.length === 0 && <p className="home-empty-copy">No upcoming sessions on the calendar.</p>}{sessions.map((session: any) => <Link href="/studio-sessions" key={session.id}><time>{new Intl.DateTimeFormat("en-KE", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(session.starts_at))}</time><span><strong>{first(session.projects)?.name || "Project session"}</strong><small>{session.location || readable(session.status)}</small></span></Link>)}</div></article>
      <article className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Across your projects</h2></div><Link href="/activity">Full history →</Link></div><div className="home-list">{activity.length === 0 && <p className="home-empty-copy">Project activity will appear here.</p>}{activity.map((item: any) => { const actor = first(item.profiles); return <div key={item.id}><time>{new Intl.DateTimeFormat("en-KE", { day:"2-digit", month:"short" }).format(new Date(item.created_at))}</time><span><strong>{actor?.stage_name || actor?.full_name || "Project team"}</strong><small>{readable(item.action)} · {first(item.projects)?.name || "Project"}</small></span></div>; })}</div></article>
    </section>
  </div></AppShell>;
}
