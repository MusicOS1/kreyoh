import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { cancelJoinRequest, createProject, requestToJoin, selectProject } from "./actions";

const first = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function ProjectsPage() {
  const { user, admin, activeProjects } = await getWorkspace();
  const activeIds = activeProjects.map((project: any) => project.id);
  const [openResult, requestsResult, membershipsResult, tracksResult, sessionsResult, roundsResult] = await Promise.all([
    admin.from("projects").select("*").eq("visibility", "discoverable").order("created_at", { ascending: false }),
    admin.from("project_join_requests").select("id,project_id,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    admin.from("project_members").select("project_id,member_roles(roles(name))").eq("user_id", user.id).eq("status", "active"),
    activeIds.length ? admin.from("tracks").select("id,project_id").in("project_id", activeIds) : Promise.resolve({ data: [] }),
    activeIds.length ? admin.from("studio_sessions").select("id,project_id,starts_at,status").in("project_id", activeIds).gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at", { ascending: true }) : Promise.resolve({ data: [] }),
    activeIds.length ? admin.from("track_voting_rounds").select("id,project_id,status").in("project_id", activeIds).eq("status", "open") : Promise.resolve({ data: [] }),
  ]);
  const projects = openResult.data || [], requests = requestsResult.data || [], memberships = membershipsResult.data || [], tracks = tracksResult.data || [], sessions = sessionsResult.data || [], rounds = roundsResult.data || [];
  const requestMap = new Map(requests.map((item: any) => [item.project_id, item]));
  const memberIds = new Set(activeIds);
  const membershipMap = new Map(memberships.map((item: any) => [item.project_id, item]));

  return <AppShell><div className="content project-hub-page">
    <div className="heading"><div><span className="eyebrow">YOUR CREATIVE WORLD</span><h1>My Projects</h1><p>Projects you own, rooms you contribute to, invitations waiting for you, and the next action in each venture.</p></div><Link href="/invitations" className="secondary-button-inline">Project Invitations</Link></div>
    <section className="project-hub-section"><h2>Projects I own or belong to</h2><div className="project-card-grid">{!activeProjects.length && <article className="panel empty-state"><h2>No active projects yet</h2><p>Start a room or accept an invitation.</p></article>}{activeProjects.map((project: any) => {
      const membership: any = membershipMap.get(project.id); const roleNames = (membership?.member_roles || []).map((row: any) => first(row.roles)?.name).filter(Boolean); const trackCount = tracks.filter((item: any) => item.project_id === project.id).length; const nextSession = sessions.find((item: any) => item.project_id === project.id); const votingOpen = rounds.some((item: any) => item.project_id === project.id);
      return <article className="panel project-discovery-card my-project-card" key={project.id}>{project.artwork_url && <img src={project.artwork_url} alt=""/>}<span className="eyebrow">{project.project_type || "MUSIC PROJECT"} · {roleNames.join(" / ") || "MEMBER"}</span><h2>{project.name}</h2><div className="project-stage-pill">{project.current_stage || (project.code === "PROJECT 001" ? "Development / Production" : "Project Setup")}</div><p>{project.description || "A FACKTS Music creative project."}</p><dl className="project-card-facts"><div><dt>Next action</dt><dd>{project.next_action || "Set the next project action"}</dd></div><div><dt>Tracks</dt><dd>{trackCount}</dd></div><div><dt>Upcoming session</dt><dd>{nextSession ? new Intl.DateTimeFormat("en-KE", { day:"2-digit", month:"short" }).format(new Date(nextSession.starts_at)) : "Not scheduled"}</dd></div><div><dt>Voting</dt><dd>{votingOpen ? "Open" : "No open round"}</dd></div></dl><form action={selectProject}><input type="hidden" name="project_id" value={project.id}/><button className="login-submit-btn">Enter project</button></form></article>;
    })}</div></section>
    <section className="project-hub-section"><h2>Open project rooms</h2><div className="project-card-grid">{!projects.length && <article className="panel empty-state"><h2>No open projects yet</h2><p>Discoverable projects will appear here when their team opens requests.</p></article>}{projects.map((project: any) => { const request: any = requestMap.get(project.id); return <article className="panel project-discovery-card" key={project.id}>{project.artwork_url && <img src={project.artwork_url} alt=""/>}<span className="eyebrow">{project.status} · {project.join_requests_open ? "REQUESTS OPEN" : "VIEW ONLY"}</span><h2>{project.name}</h2><p>{project.description || "A FACKTS Music creative project."}</p>{memberIds.has(project.id) ? <form action={selectProject}><input type="hidden" name="project_id" value={project.id}/><button>Enter project</button></form> : request?.status === "pending" ? <div className="join-request-status"><strong>Request pending</strong><form action={cancelJoinRequest}><input type="hidden" name="request_id" value={request.id}/><button>Cancel request</button></form></div> : project.join_requests_open ? <form action={requestToJoin} className="project-request-form"><input type="hidden" name="project_id" value={project.id}/><textarea name="message" placeholder="A short note to the project team (optional)"/><button>Request to Join</button></form> : <span className="status-pill">Requests closed</span>}</article>; })}</div></section>
    <section className="panel create-project-panel" id="start-project"><span className="eyebrow">START A ROOM</span><h2>Create a project</h2><p>You will become its Project Lead. Every project keeps its people, music, sessions and operating history separate.</p><form action={createProject} className="operations-form"><input name="name" required placeholder="Project name"/><input name="project_type" placeholder="Project type (mixtape, single, album…)"/><textarea name="description" placeholder="What are you building?"/><select name="visibility" defaultValue="private"><option value="private">Private project</option><option value="discoverable">Discoverable project</option></select><label className="terms-check"><input type="checkbox" name="join_requests_open"/>Allow join requests</label><button>Create project</button></form></section>
  </div></AppShell>;
}
