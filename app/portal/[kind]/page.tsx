import Link from "next/link";
import {notFound} from "next/navigation";
import AppShell from "../../../components/AppShell";
import {creatorDisplayName} from "../../../lib/profileIdentity";
import {getWorkspace,hasAnyRole} from "../../../lib/workspace";

const first=(value:any)=>Array.isArray(value)?value[0]:value;

const CONFIG:any={
  ar:{
    role:"A&R",
    title:"A&R Portal",
    kicker:"CREATIVE / REPERTOIRE OVERSIGHT",
    intro:"Review the music, rights, project risks and commercial pathways without losing sight of what needs to move next.",
  },
  manager:{
    role:"Manager",
    title:"Artist Manager Portal",
    kicker:"ARTIST / PROJECT MANAGEMENT",
    intro:"Keep the artist's project, money, sessions, opportunities and delivery risks visible in one place.",
  },
  studio:{
    role:"Studio Owner",
    title:"Studio Owner Portal",
    kicker:"STUDIO / PRODUCTION OVERSIGHT",
    intro:"See the sessions, production files, unresolved studio issues and the wider project context around the work happening in your rooms.",
  },
};

export default async function SupportPortalPage({params}:{params:Promise<{kind:string}>}){
  const{kind}=await params;
  const config=CONFIG[kind];
  if(!config)notFound();

  const{admin,user,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
  }

  const isManagement=hasAnyRole(roles,["Super Admin","Admin","Project Lead"]);
  if(!roles.includes(config.role)&&!isManagement){
    return<AppShell><div className="content empty-state"><h2>{config.title}</h2><p>This portal activates when the project assigns you the {config.role} role.</p></div></AppShell>;
  }

  const[
    relationshipsR,tracksR,issuesR,sessionsR,oppsR,splitsR,rightsR,
    budgetR,expensesR,revenueR,tasksR,updatesR
  ]=await Promise.all([
    admin.from("project_support_relationships")
      .select("*,artist:profiles!project_support_relationships_artist_id_fkey(full_name,stage_name,nickname)")
      .eq("project_id",project.id)
      .eq("support_role",config.role)
      .eq(isManagement?"project_id":"support_user_id",isManagement?project.id:user.id)
      .eq("status","active"),
    admin.from("tracks").select("id,working_title,development_status,status").eq("project_id",project.id),
    admin.from("track_operational_issues").select("id,track_id,category,severity,status,title").eq("project_id",project.id).neq("status","resolved"),
    admin.from("studio_sessions").select("id,starts_at,status,location,tracks(working_title)").eq("project_id",project.id).gte("starts_at",new Date().toISOString()).neq("status","cancelled").order("starts_at",{ascending:true}).limit(8),
    admin.from("commercial_opportunities").select("id,organisation,opportunity_type,revenue_pathway,status,estimated_value,currency,next_action").eq("project_id",project.id).order("created_at",{ascending:false}).limit(12),
    admin.from("track_splits").select("track_id,percentage,status").eq("project_id",project.id),
    admin.from("track_rights_checks").select("track_id,status").eq("project_id",project.id),
    admin.from("project_budgets").select("*").eq("project_id",project.id).maybeSingle(),
    admin.from("project_expenses").select("amount,currency,payment_status").eq("project_id",project.id),
    admin.from("revenue_records").select("amount,currency,payment_status").eq("project_id",project.id),
    admin.from("project_tasks").select("id,title,status,due_date,assignee_id").eq("project_id",project.id).neq("status","done"),
    admin.from("project_updates").select("*").eq("project_id",project.id).order("created_at",{ascending:false}).limit(5),
  ]);

  const relationships=relationshipsR.data||[];
  const tracks=tracksR.data||[];
  const issues=issuesR.data||[];
  const sessions=sessionsR.data||[];
  const opportunities=oppsR.data||[];
  const splits=splitsR.data||[];
  const rights=rightsR.data||[];
  const expenses=expensesR.data||[];
  const revenue=revenueR.data||[];
  const tasks=tasksR.data||[];
  const updates=updatesR.data||[];
  const budget=budgetR.data;

  const supportedArtists=Array.from(new Set(relationships.map((item:any)=>creatorDisplayName(first(item.artist))).filter(Boolean)));
  const incompleteRights=new Set(rights.filter((r:any)=>!["clear","not_applicable"].includes(r.status)).map((r:any)=>r.track_id)).size;
  const splitTracks=new Set(splits.map((r:any)=>r.track_id));
  const unconfirmedSplits=Array.from(splitTracks).filter((trackId:any)=>{
    const rows=splits.filter((r:any)=>r.track_id===trackId);
    const total=rows.reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);
    return Math.abs(total-100)>.001||rows.some((row:any)=>row.status!=="confirmed");
  }).length;
  const openIssues=issues.filter((i:any)=>!["resolved","accepted_risk"].includes(i.status));
  const activeOpps=opportunities.filter((o:any)=>!["lost","completed"].includes(o.status));
  const currency=budget?.currency||"KES";
  const paidSpend=expenses.filter((x:any)=>x.currency===currency&&x.payment_status==="paid").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
  const committed=expenses.filter((x:any)=>x.currency===currency&&x.payment_status==="committed").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
  const received=revenue.filter((x:any)=>x.currency===currency&&x.payment_status==="paid").reduce((s:number,x:any)=>s+Number(x.amount||0),0);

  return<AppShell>
    <style>{`
      .portal-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:16px 0 24px}
      .portal-kpis article{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .portal-kpis span{display:block;color:rgba(255,255,255,.42);font-size:9px;text-transform:uppercase}.portal-kpis strong{display:block;margin-top:6px;font-size:18px}
      .portal-links{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:16px 0 24px}.portal-links a{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}
      @media(max-width:1000px){.portal-kpis,.portal-links{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.portal-kpis,.portal-links{grid-template-columns:1fr}}
    `}</style>
    <div className="content operations-page">
      <div className="heading">
        <div><span className="eyebrow">{project.code} / {config.kicker}</span><h1>{config.title}</h1><p>{config.intro}</p></div>
        <a className="secondary-button-inline" href={`/api/projects/${project.id}/report`}>Download Project Report ↓</a>
      </div>

      {!!supportedArtists.length&&<p><strong>Supporting:</strong> {supportedArtists.join(" · ")}</p>}

      <section className="portal-kpis">
        <article><span>Tracks</span><strong>{tracks.length}</strong></article>
        <article><span>Open issues</span><strong>{openIssues.length}</strong></article>
        <article><span>Upcoming sessions</span><strong>{sessions.length}</strong></article>
        <article><span>Active opportunities</span><strong>{activeOpps.length}</strong></article>
        <article><span>Inbox updates</span><strong>{updates.length}</strong></article>
      </section>

      <section className="portal-links">
        <Link href="/track-records">Track Records →</Link>
        <Link href="/splits">Splits & Rights →</Link>
        <Link href="/opportunities">Opportunities →</Link>
        <Link href="/finance">Finance Transparency →</Link>
        <Link href="/reports">Reports →</Link>
      </section>

      <section className="platform-home-split">
        <article className="platform-home-section">
          <span className="eyebrow">PROJECT READINESS</span><h2>What needs attention</h2>
          <div className="home-list">
            <div><time>RIGHTS</time><span><strong>{incompleteRights} track{incompleteRights===1?"":"s"} with incomplete/blocked rights checks</strong></span></div>
            <div><time>SPLITS</time><span><strong>{unconfirmedSplits} track{unconfirmedSplits===1?"":"s"} without fully confirmed 100% splits</strong></span></div>
            <div><time>TASKS</time><span><strong>{tasks.length} open project action{tasks.length===1?"":"s"}</strong></span></div>
          </div>
        </article>

        <article className="platform-home-section">
          <span className="eyebrow">FINANCIAL TRANSPARENCY</span><h2>Project economics</h2>
          <div className="home-list">
            <div><time>BUDGET</time><span><strong>{currency} {Number(budget?.budget_amount||0).toLocaleString("en-KE")}</strong></span></div>
            <div><time>SPEND</time><span><strong>{currency} {paidSpend.toLocaleString("en-KE")} paid</strong><small>{currency} {committed.toLocaleString("en-KE")} committed</small></span></div>
            <div><time>REVENUE</time><span><strong>{currency} {received.toLocaleString("en-KE")} received</strong></span></div>
          </div>
          <p><small>Support roles see finance for transparency. Editing remains restricted to authorised finance/project roles.</small></p>
        </article>
      </section>

      <section className="platform-home-split">
        <article className="platform-home-section">
          <span className="eyebrow">UPCOMING STUDIO</span><h2>Sessions</h2>
          <div className="home-list">{!sessions.length&&<p>No upcoming sessions.</p>}{sessions.map((s:any)=><Link href="/studio-sessions" key={s.id}><time>{new Date(s.starts_at).toLocaleDateString("en-KE")}</time><span><strong>{first(s.tracks)?.working_title||"Project session"}</strong><small>{s.location||String(s.status).replaceAll("_"," ")}</small></span></Link>)}</div>
        </article>

        <article className="platform-home-section">
          <span className="eyebrow">COMMERCIAL</span><h2>Current opportunities</h2>
          <div className="home-list">{!activeOpps.length&&<p>No active opportunities.</p>}{activeOpps.slice(0,6).map((o:any)=><Link href="/opportunities" key={o.id}><time>{String(o.status).replaceAll("_"," ")}</time><span><strong>{o.organisation||o.opportunity_type}</strong><small>{o.revenue_pathway}{o.next_action?` · ${o.next_action}`:""}</small></span></Link>)}</div>
        </article>
      </section>

      <section className="platform-home-section">
        <span className="eyebrow">PROJECT UPDATES</span><h2>What changed and why it matters</h2>
        <div className="home-list">{!updates.length&&<p>No updates published yet.</p>}{updates.map((u:any)=>{
          const impact=config.role==="A&R"?u.impact_ar:config.role==="Manager"?u.impact_manager:u.impact_studio_owner;
          return<div key={u.id}><time>{new Date(u.created_at).toLocaleDateString("en-KE")}</time><span><strong>{u.title}{u.version_label?` · ${u.version_label}`:""}</strong><small>{u.summary}</small>{impact&&<small>For you: {impact}</small>}</span></div>
        })}</div>
      </section>
    </div>
  </AppShell>;
}
