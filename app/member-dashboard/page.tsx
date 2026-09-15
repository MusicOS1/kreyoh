import Link from "next/link";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {canViewProjectFinanceReport} from "../../lib/financeAccess";

const first=(value:any)=>Array.isArray(value)?value[0]:value;

export default async function MemberDashboardPage(){
  const{admin,user,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Join a project to activate your dashboard</h2><Link href="/projects">Open Projects →</Link></div></AppShell>;
  }

  const[
    tasksR,sessionsR,notificationsR,tracksR,oppsR,updatesR,issuesR
  ]=await Promise.all([
    admin.from("project_tasks").select("id,title,status,due_date").eq("project_id",project.id).eq("assignee_id",user.id).neq("status","done").order("due_date",{ascending:true,nullsFirst:false}).limit(8),
    admin.from("studio_sessions").select("id,starts_at,status,location,tracks(working_title)").eq("project_id",project.id).gte("starts_at",new Date().toISOString()).neq("status","cancelled").order("starts_at",{ascending:true}).limit(6),
    admin.from("notifications").select("id,title,body,type,created_at").eq("user_id",user.id).is("read_at",null).order("created_at",{ascending:false}).limit(6),
    admin.from("tracks").select("id,working_title,track_code,development_status,status").eq("project_id",project.id).order("created_at",{ascending:false}).limit(8),
    admin.from("commercial_opportunities").select("id,organisation,opportunity_type,revenue_pathway,status,next_action").eq("project_id",project.id).order("created_at",{ascending:false}).limit(6),
    admin.from("project_updates").select("id,title,summary,created_at").eq("project_id",project.id).order("created_at",{ascending:false}).limit(5),
    admin.from("track_operational_issues").select("id,title,severity,status,track_id").eq("project_id",project.id).in("status",["open","in_progress"]).order("occurred_at",{ascending:false}).limit(6),
  ]);

  const tasks=tasksR.data||[];
  const sessions=sessionsR.data||[];
  const notifications=notificationsR.data||[];
  const tracks=tracksR.data||[];
  const opportunities=oppsR.data||[];
  const updates=updatesR.data||[];
  const issues=issuesR.data||[];

  const canViewFinance=canViewProjectFinanceReport(roles);

  const portal=roles.includes("A&R")
    ?"/portal/ar"
    :roles.includes("Manager")
    ?"/portal/manager"
    :roles.includes("Studio Owner")
    ?"/portal/studio"
    :null;

  return<AppShell>
    <style>{`
      .member-dash{max-width:1320px;margin:0 auto}
      .member-hero{position:relative;overflow:hidden;padding:32px;border:1px solid rgba(255,255,255,.08);border-radius:24px;background:radial-gradient(circle at 90% 12%,rgba(249,115,22,.14),transparent 33%),linear-gradient(145deg,#11141c,#07080b)}
      .member-hero h1{max-width:850px;margin:8px 0 12px;font-size:clamp(40px,5vw,68px);line-height:.95;letter-spacing:-.055em}
      .member-hero p{max-width:760px;color:rgba(255,255,255,.6);font-size:14px;line-height:1.6}
      .member-role-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:16px}.member-role-row span{padding:7px 10px;border:1px solid rgba(255,255,255,.09);border-radius:999px;font-size:9px;text-transform:uppercase}
      .member-actions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:16px 0 24px}
      .member-actions a{display:flex;min-height:110px;flex-direction:column;justify-content:space-between;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .member-actions a:hover{border-color:rgba(249,115,22,.3);background:rgba(249,115,22,.05)}
      .member-actions small{color:rgba(255,255,255,.4);font-size:8px;text-transform:uppercase}.member-actions strong{font-size:12px}
      .member-focus{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:24px}
      .member-focus article{padding:16px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .member-focus span{display:block;color:rgba(255,255,255,.42);font-size:8px;text-transform:uppercase}.member-focus strong{display:block;margin-top:6px;font-size:22px}
      @media(max-width:1100px){.member-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.member-focus{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.member-actions,.member-focus{grid-template-columns:1fr}.member-hero{padding:24px 20px}}
    `}</style>

    <div className="content member-dash">
      <section className="member-hero">
        <span className="eyebrow">{project.code} / MEMBER VIEW</span>
        <h1>{project.name}</h1>
        <p>This dashboard is built for participation, transparency and the work that needs your attention—not project administration.</p>
        <div className="member-role-row">{roles.map((role)=><span key={role}>{role}</span>)}</div>
      </section>

      <section className="member-actions">
        {portal&&<Link href={portal}><small>ROLE PORTAL</small><strong>Open My Support Portal →</strong></Link>}
        <Link href="/track-records"><small>MUSIC</small><strong>Track Records →</strong></Link>
        <Link href="/studio-sessions"><small>WORKFLOW</small><strong>Studio Sessions →</strong></Link>
        <Link href="/opportunities"><small>COMMERCIAL</small><strong>Opportunities →</strong></Link>
        {canViewFinance&&<Link href="/finance"><small>TRANSPARENCY</small><strong>Financial Report →</strong></Link>}
        <Link href="/reports"><small>REPORTING</small><strong>Project Reports →</strong></Link>
        <Link href="/inbox"><small>COMMUNICATION</small><strong>Inbox →</strong></Link>
        <Link href="/professional-record"><small>CAREER RECORD</small><strong>My Professional Record →</strong></Link>
        {roles.includes("Artist")&&<Link href="/support-team"><small>MY TEAM</small><strong>Support Team →</strong></Link>}
      </section>

      <section className="member-focus">
        <article><span>My open actions</span><strong>{tasks.length}</strong></article>
        <article><span>Upcoming sessions</span><strong>{sessions.length}</strong></article>
        <article><span>Unread inbox</span><strong>{notifications.length}</strong></article>
        <article><span>Open project issues</span><strong>{issues.length}</strong></article>
      </section>

      <section className="platform-home-split">
        <article className="platform-home-section">
          <div className="platform-section-heading"><div><span className="eyebrow">MY ACTIONS</span><h2>What I need to do</h2></div><Link href="/tasks">All tasks →</Link></div>
          <div className="home-list">
            {!tasks.length&&<p>No open tasks assigned to you.</p>}
            {tasks.map((task:any)=><Link href="/tasks" key={task.id}><time>{task.due_date||"Open"}</time><span><strong>{task.title}</strong><small>{String(task.status).replaceAll("_"," ")}</small></span></Link>)}
          </div>
        </article>

        <article className="platform-home-section">
          <div className="platform-section-heading"><div><span className="eyebrow">NEXT SESSIONS</span><h2>Where the work happens</h2></div><Link href="/studio-sessions">Studio →</Link></div>
          <div className="home-list">
            {!sessions.length&&<p>No upcoming sessions.</p>}
            {sessions.map((session:any)=><Link href="/studio-sessions" key={session.id}><time>{new Date(session.starts_at).toLocaleDateString("en-KE")}</time><span><strong>{first(session.tracks)?.working_title||"Project session"}</strong><small>{session.location||String(session.status).replaceAll("_"," ")}</small></span></Link>)}
          </div>
        </article>
      </section>

      <section className="platform-home-split">
        <article className="platform-home-section">
          <div className="platform-section-heading"><div><span className="eyebrow">RECENT MUSIC</span><h2>Tracks in the project</h2></div><Link href="/track-records">Track Records →</Link></div>
          <div className="home-list">
            {tracks.map((track:any)=><Link href={`/track-records/${track.id}`} key={track.id}><time>{track.track_code||"TRACK"}</time><span><strong>{track.working_title||"Untitled track"}</strong><small>{String(track.development_status||track.status||"in development").replaceAll("_"," ")}</small></span></Link>)}
          </div>
        </article>

        <article className="platform-home-section">
          <div className="platform-section-heading"><div><span className="eyebrow">OPPORTUNITIES</span><h2>What may come back</h2></div><Link href="/opportunities">Open pipeline →</Link></div>
          <div className="home-list">
            {!opportunities.length&&<p>No opportunities recorded yet.</p>}
            {opportunities.map((item:any)=><Link href="/opportunities" key={item.id}><time>{String(item.status).replaceAll("_"," ")}</time><span><strong>{item.organisation||item.opportunity_type}</strong><small>{item.revenue_pathway}{item.next_action?` · ${item.next_action}`:""}</small></span></Link>)}
          </div>
        </article>
      </section>

      <section className="platform-home-section">
        <div className="platform-section-heading"><div><span className="eyebrow">PROJECT UPDATES</span><h2>What changed</h2></div><Link href="/inbox">Open Inbox →</Link></div>
        <div className="home-list">
          {!updates.length&&<p>No project updates published yet.</p>}
          {updates.map((update:any)=><div key={update.id}><time>{new Date(update.created_at).toLocaleDateString("en-KE")}</time><span><strong>{update.title}</strong><small>{update.summary}</small></span></div>)}
        </div>
      </section>
    </div>
  </AppShell>;
}
