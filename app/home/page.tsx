import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { selectProject } from "../projects/actions";
import { respondToInvitation } from "../invitations/actions";

const first=(value:any)=>Array.isArray(value)?value[0]:value;
const readable=(value:string|null|undefined)=>String(value||"Update").replaceAll("_"," ").replace(/\b\w/g,(letter)=>letter.toUpperCase());

export default async function PlatformHomePage(){
  const{user,profile,admin,activeProjects,project}=await getWorkspace();
  const projectIds=(activeProjects||[]).map((item:any)=>item.id);
  const now=new Date().toISOString();

  const[
    membershipsResult,tasksResult,sessionsResult,notificationsResult,
    invitationsResult,activityResult,roundsResult,milestonesResult,creatorsResult,splitsResult
  ]=await Promise.all([
    admin.from("project_members").select("id,project_id,projects(*),member_roles(roles(name))").eq("user_id",user.id).eq("status","active"),
    admin.from("project_tasks").select("id,title,status,due_date,project_id,projects(name)",{count:"exact"}).eq("assignee_id",user.id).in("project_id",projectIds.length?projectIds:["00000000-0000-0000-0000-000000000000"]).neq("status","done").order("due_date",{ascending:true,nullsFirst:false}).limit(6),
    projectIds.length?admin.from("studio_sessions").select("id,starts_at,status,location,project_id,projects(name)",{count:"exact"}).in("project_id",projectIds).gte("starts_at",now).neq("status","cancelled").order("starts_at",{ascending:true}).limit(5):Promise.resolve({data:[],count:0}),
    admin.from("notifications").select("id,title,body,type,project_id,entity_type,entity_id,read_at,created_at",{count:"exact"}).eq("user_id",user.id).is("read_at",null).order("created_at",{ascending:false}).limit(6),
    admin.from("project_invitations").select("id,status,message,created_at,projects(id,code,name,description),roles(name),inviter:profiles!project_invitations_invited_by_fkey(full_name,stage_name)",{count:"exact"}).eq("user_id",user.id).eq("status","pending").order("created_at",{ascending:false}).limit(5),
    projectIds.length?admin.from("activity_log").select("id,action,created_at,project_id,projects(name),profiles(full_name,stage_name)").in("project_id",projectIds).order("created_at",{ascending:false}).limit(8):Promise.resolve({data:[],count:0}),
    projectIds.length?admin.from("track_voting_rounds").select("id,project_id,status,title").in("project_id",projectIds).eq("status","open"):Promise.resolve({data:[],count:0}),
    projectIds.length?admin.from("project_milestones").select("id,project_id,title,status,position").in("project_id",projectIds).in("status",["in_progress","blocked","needs_attention"]).order("position",{ascending:true}).limit(12):Promise.resolve({data:[],count:0}),
    Promise.resolve({data: []}),
    admin.from("track_splits").select("id",{count:"exact",head:true}).eq("contributor_id",user.id).eq("status","awaiting_confirmation").in("project_id",projectIds.length?projectIds:["00000000-0000-0000-0000-000000000000"]),
  ]);

  const memberships=membershipsResult.data||[];
  const tasks=tasksResult.data||[];
  const sessions=sessionsResult.data||[];
  const notifications=notificationsResult.data||[];
  const invitations=invitationsResult.data||[];
  const activity=activityResult.data||[];
  const rounds=roundsResult.data||[];
  const milestones=milestonesResult.data||[];
  const creators=creatorsResult.data||[];
  const name=creatorDisplayName(profile)||user.email?.split("@")[0]||"Creator";
  const hasProjects=memberships.length>0;
  const primaryInvitation=first(invitations);

  if(!hasProjects){
    return<AppShell>
      <style>{`
        .activation-shell{max-width:1280px;margin:0 auto;padding:34px 30px 70px}
        .activation-hero{position:relative;overflow:hidden;padding:34px;border:1px solid rgba(255,255,255,.08);border-radius:24px;background:radial-gradient(circle at 90% 15%,rgba(249,115,22,.12),transparent 34%),linear-gradient(145deg,rgba(16,19,28,.98),rgba(7,8,12,.98))}
        .activation-hero h1{max-width:760px;margin:8px 0 12px;font-size:clamp(38px,5vw,70px);line-height:.96;letter-spacing:-.055em}
        .activation-hero p{max-width:720px;color:rgba(255,255,255,.66);font-size:15px;line-height:1.6}
        .activation-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
        .activation-card{display:flex;min-height:200px;flex-direction:column;justify-content:space-between;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(255,255,255,.025);transition:.2s ease}
        .activation-card:hover{transform:translateY(-3px);border-color:rgba(249,115,22,.35);background:rgba(249,115,22,.05)}
        .activation-card span{font-size:9px;font-weight:900;letter-spacing:.12em;color:#ff9a46}
        .activation-card h3{margin:10px 0 8px;font-size:18px}.activation-card p{margin:0;color:rgba(255,255,255,.48);font-size:11px;line-height:1.55}
        .activation-card b{margin-top:18px;font-size:11px}
        .activation-invite{margin-top:18px;padding:22px;border:1px solid rgba(249,115,22,.26);border-radius:18px;background:rgba(249,115,22,.06)}
        .activation-invite-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}
        @media(max-width:1100px){.activation-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:700px){.activation-shell{padding:20px 14px 55px}.activation-hero{padding:24px 20px}.activation-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="activation-shell">
        <section className="activation-hero">
          <span className="eyebrow">WELCOME TO FACKTS MUSIC</span>
          <h1>What can you do here today?</h1>
          <p>You do not need to understand the whole platform first. Pick one useful move and start from there.</p>
        </section>

        {primaryInvitation&&<section className="activation-invite">
          <span className="eyebrow">PROJECT INVITATION WAITING</span>
          <h2>{first(primaryInvitation.projects)?.name||"A project wants you in"}</h2>
          <p>{primaryInvitation.message||`${creatorDisplayName(first(primaryInvitation.inviter))||"A project lead"} invited you to join as ${first(primaryInvitation.roles)?.name||"a contributor"}.`}</p>
          <div className="activation-invite-actions">
            <form action={respondToInvitation}><input type="hidden" name="invitation_id" value={primaryInvitation.id}/><input type="hidden" name="response" value="accepted"/><button className="login-submit-btn">Accept & Enter Project</button></form>
            <form action={respondToInvitation}><input type="hidden" name="invitation_id" value={primaryInvitation.id}/><input type="hidden" name="response" value="declined"/><button className="member-remove-button">Decline</button></form>
            {invitations.length>1&&<Link className="secondary-button-inline" href="/invitations">View all {invitations.length} invitations</Link>}
          </div>
        </section>}

        <section className="activation-grid">
          <Link className="activation-card" href="/projects">
            <div><span>01</span><h3>Join a Project</h3><p>Find an open project, request access, or accept an invitation and start contributing.</p></div><b>Find a project →</b>
          </Link>
          <Link className="activation-card" href="/projects#start-project">
            <div><span>02</span><h3>Start a Project</h3><p>Open your own room for a single, EP, album, mixtape or other music venture.</p></div><b>Create a project →</b>
          </Link>
          <Link className="activation-card" href="/professional-record">
            <div><span>03</span><h3>Build My Professional Record</h3><p>Record what you produced, wrote, performed or engineered—with verification, not just self-claims.</p></div><b>Build my record →</b>
          </Link>
        </section>
      </div>
    </AppShell>;
  }

  return<AppShell>
    <style>{`
      .active-quick-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0 26px}
      .active-quick-actions a{display:flex;min-height:105px;flex-direction:column;justify-content:space-between;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .active-quick-actions a:hover{border-color:rgba(249,115,22,.3);background:rgba(249,115,22,.05)}
      .active-quick-actions small{color:rgba(255,255,255,.42);font-size:9px}.active-quick-actions strong{font-size:13px}
      .home-invite-strip{margin:0 0 18px;padding:16px 18px;border:1px solid rgba(249,115,22,.22);border-radius:14px;background:rgba(249,115,22,.055)}
      @media(max-width:1000px){.active-quick-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.active-quick-actions{grid-template-columns:1fr}}
    `}</style>
    <div className="content platform-home-page">
      <section className="platform-home-hero">
        <div><span className="eyebrow">FACKTS MUSIC HOME</span><h1>What needs your attention today, {name}?</h1><p>Open a project or pick up an outstanding action.</p></div>
        <div className="platform-home-hero-actions"><Link href={project?"/member-dashboard":"/projects"} className="login-submit-btn">{project?"Continue Current Project":"My Projects"}</Link><Link href="/projects#start-project" className="secondary-button-inline">+ Start Project</Link></div>
      </section>

      {!!invitations.length&&<section className="home-invite-strip"><strong>{invitations.length} project invitation{invitations.length===1?"":"s"} waiting.</strong> <Link href="/invitations">Review invitations →</Link></section>}

      <section className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">NEEDS YOUR ATTENTION</span><h2>What needs to move</h2></div><Link href="/inbox">Open inbox →</Link></div>
        <div className="attention-grid">
          <Link href="/splits?view=mine" className="attention-card"><strong>{splitsResult.error ? "—" : splitsResult.count || 0}</strong><span>Splits to review</span></Link>
          <Link href="/my-actions?kind=tasks" className="attention-card"><strong>{tasksResult.count ?? tasks.length}</strong><span>Open assignment{tasks.length===1?"":"s"}</span></Link>
          <Link href="/my-actions?kind=sessions" className="attention-card"><strong>{sessionsResult.count ?? sessions.length}</strong><span>Upcoming session{sessions.length===1?"":"s"}</span></Link>
          <Link href="/my-actions?kind=voting" className="attention-card"><strong>{rounds.length}</strong><span>Voting round{rounds.length===1?"":"s"} open</span></Link>
          <Link href="/invitations" className="attention-card"><strong>{invitationsResult.count ?? invitations.length}</strong><span>Project invitation{invitations.length===1?"":"s"}</span></Link>
          <Link href="/inbox" className="attention-card"><strong>{notificationsResult.count ?? notifications.length}</strong><span>Unread message{notifications.length===1?"":"s"}</span></Link>
        </div>
      </section>

      <section className="platform-home-section"><div className="platform-section-heading"><div><span className="eyebrow">MY PROJECTS</span><h2>The rooms you are building in</h2></div><Link href="/projects">View all →</Link></div>
        <div className="home-project-grid">{memberships.map((membership:any)=>{const item=first(membership.projects)||{};const roleNames=(membership.member_roles||[]).map((row:any)=>first(row.roles)?.name).filter(Boolean);const nextMilestone=milestones.find((m:any)=>m.project_id===item.id);const votingOpen=rounds.some((round:any)=>round.project_id===item.id);return<article className="home-project-card" key={membership.id}>
          <div className="home-project-art" style={item.artwork_url?{backgroundImage:`linear-gradient(180deg,rgba(3,8,15,.08),rgba(3,8,15,.92)),url(${item.artwork_url})`}:undefined}><span>{item.code||"PROJECT"}</span></div>
          <div className="home-project-copy"><span className="eyebrow">{item.project_type||"MUSIC PROJECT"}</span><h3>{item.name}</h3><div className="project-stage-pill">{item.current_stage||(item.code==="PROJECT 001"?"Development / Production":"Project Setup")}</div><p><strong>Next:</strong> {item.next_action||nextMilestone?.title||"Set the next project action"}</p><div className="project-card-meta"><span>{roleNames.join(" · ")||"Project member"}</span>{votingOpen&&<span>Voting open</span>}</div><form action={selectProject}><input type="hidden" name="project_id" value={item.id}/><button>Enter project →</button></form></div>
        </article>})}</div>
      </section>

    </div>
  </AppShell>;
}
