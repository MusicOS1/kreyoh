import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { creatorDisplayName } from "../../../lib/profileIdentity";
import { getWorkspace, hasAnyRole } from "../../../lib/workspace";
import {
  addOperationalIssue,
  addReleaseEvent,
  addTrackRelease,
  approveTrackCredit,
  saveRightsCheck,
  updateOperationalIssue,
} from "../actions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;

const RIGHTS=[
  ["producer_agreement","Producer agreement"],
  ["beat_rights","Beat / production rights"],
  ["songwriter_credits","Songwriter credits"],
  ["splits_confirmed","Splits confirmed"],
  ["samples_cleared","Samples / interpolations cleared"],
  ["performer_approvals","Performer approvals"],
  ["master_ownership","Master ownership confirmed"],
] as const;

const ISSUE_CATEGORIES=[
  ["late_artist","Late artist"],["no_show","No-show"],["bad_verse","Bad / rejected verse"],
  ["missing_stems","Missing stems"],["split_confusion","Split confusion"],["credit_dispute","Credit dispute"],
  ["mixing_confusion","Mixing confusion"],["mastering_confusion","Mastering confusion"],["sequencing","Sequencing"],
  ["communication","Communication"],["session_scheduling","Session scheduling"],["approval_delay","Approval delay"],
  ["approval_rejected","Approval rejected"],["rights_clearance","Rights / clearance"],["budget_overrun","Budget overrun"],
  ["technical_file","Technical / file issue"],["distribution_release","Distribution / release"],["other","Other"],
] as const;

export default async function TrackPassportPage({params}:{params:Promise<{trackId:string}>}){
  const{trackId}=await params;
  const{admin,project,membership,roles}=await getWorkspace();
  if(!project||!membership)return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;

  const[
    trackR,contributorsR,splitsR,assetsR,expensesR,sessionsR,issuesR,
    rightsR,releasesR,eventsR,opportunitiesR,revenueR,membersR
  ]=await Promise.all([
    admin.from("tracks").select("*,beats(title,beat_code,producer_name)").eq("id",trackId).eq("project_id",project.id).maybeSingle(),
    admin.from("track_contributors").select("id,user_id,contribution_role,approved,profiles(full_name,stage_name,nickname)").eq("track_id",trackId),
    admin.from("track_splits").select("id,contributor_id,contribution_role,percentage,status,profiles(full_name,stage_name,nickname)").eq("track_id",trackId),
    admin.from("project_assets").select("id,file_name,mime_type,asset_kind,version_note,created_at,profiles!project_assets_uploaded_by_fkey(full_name,stage_name,nickname)").eq("project_id",project.id).eq("entity_type","track").eq("entity_id",trackId).order("created_at",{ascending:false}),
    admin.from("project_expenses").select("id,amount,currency,category,vendor,payment_status,expense_date,notes").eq("project_id",project.id).eq("track_id",trackId).order("expense_date",{ascending:false}),
    admin.from("studio_sessions").select("id,starts_at,status,location,notes,outcomes").eq("project_id",project.id).eq("track_id",trackId).order("starts_at",{ascending:false}),
    admin.from("track_operational_issues").select("*").eq("project_id",project.id).eq("track_id",trackId).order("occurred_at",{ascending:false}),
    admin.from("track_rights_checks").select("*").eq("project_id",project.id).eq("track_id",trackId),
    admin.from("track_release_records").select("*").eq("project_id",project.id).eq("track_id",trackId).order("release_date",{ascending:false}),
    admin.from("track_release_events").select("*").eq("project_id",project.id).eq("track_id",trackId).order("event_date",{ascending:false}),
    admin.from("commercial_opportunities").select("id,organisation,opportunity_type,revenue_pathway,status,estimated_value,contracted_value,currency,next_action").eq("project_id",project.id).eq("track_id",trackId).order("created_at",{ascending:false}),
    admin.from("revenue_records").select("id,revenue_source,amount,currency,payment_status,received_date,expected_date,notes").eq("project_id",project.id).eq("track_id",trackId).order("created_at",{ascending:false}),
    admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).eq("status","active"),
  ]);

  const track=trackR.data;if(!track)notFound();

  const contributors=contributorsR.data||[],splits=splitsR.data||[],assets=assetsR.data||[],expenses=expensesR.data||[],
    sessions=sessionsR.data||[],issues=issuesR.data||[],rights=rightsR.data||[],releases=releasesR.data||[],
    events=eventsR.data||[],opportunities=opportunitiesR.data||[],revenue=revenueR.data||[],members=membersR.data||[];

  const splitTotal=splits.reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);
  const allSplitsConfirmed=splitTotal===100&&splits.length>0&&splits.every((row:any)=>row.status==="confirmed");
  const rightsMap=new Map(rights.map((row:any)=>[row.check_key,row]));
  const allRightsClear=RIGHTS.every(([key])=>{const status=(rightsMap.get(key) as any)?.status;return status==="clear"||status==="not_applicable";});
  const anyRightsBlocked=rights.some((row:any)=>row.status==="blocked");
  const rightsClean=allSplitsConfirmed&&allRightsClear&&!anyRightsBlocked;
  const openIssues=issues.filter((row:any)=>!["resolved","accepted_risk"].includes(row.status));

  const spendByCurrency=new Map<string,number>();
  expenses.filter((x:any)=>x.payment_status==="paid").forEach((x:any)=>spendByCurrency.set(x.currency||"KES",(spendByCurrency.get(x.currency||"KES")||0)+Number(x.amount||0)));
  const revenueByCurrency=new Map<string,number>();
  revenue.filter((x:any)=>x.payment_status==="paid").forEach((x:any)=>revenueByCurrency.set(x.currency||"KES",(revenueByCurrency.get(x.currency||"KES")||0)+Number(x.amount||0)));

  const fileKinds=new Set(assets.map((x:any)=>String(x.asset_kind||"").toLowerCase()));
  const missingStems=!fileKinds.has("stems");
  const canManage=hasAnyRole(roles,["Super Admin","Admin","Project Lead","A&R"]);
  const canRelease=hasAnyRole(roles,["Super Admin","Admin","Project Lead","A&R","Manager"]);

  const grouped={
    Producers:contributors.filter((c:any)=>["producer","co_producer","production"].includes(String(c.contribution_role).toLowerCase())),
    Writers:contributors.filter((c:any)=>["writer","songwriter","composer"].includes(String(c.contribution_role).toLowerCase())),
    Performers:contributors.filter((c:any)=>["artist","featured_artist","vocalist","performer"].includes(String(c.contribution_role).toLowerCase())),
    Engineers:contributors.filter((c:any)=>["engineer","mix_engineer","mastering_engineer","recording"].includes(String(c.contribution_role).toLowerCase())),
  };

  return<AppShell><style>{`
    .passport-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .passport-span{grid-column:1/-1}
    .passport-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:14px 0}
    .passport-kpis article{padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.025)}
    .passport-kpis span{display:block;color:rgba(255,255,255,.42);font-size:9px;text-transform:uppercase;font-weight:850}
    .passport-kpis strong{display:block;margin-top:6px;font-size:15px}
    .passport-list{display:grid;gap:8px}.passport-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .passport-row small{display:block;color:rgba(255,255,255,.4)}.rights-clear{color:#6ee7b7}.rights-warn{color:#f59e0b}.rights-blocked{color:#ef4444}
    @media(max-width:900px){.passport-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.passport-grid{grid-template-columns:1fr}.passport-span{grid-column:auto}}
  `}</style><div className="content operations-page">
    <div className="heading"><div><span className="eyebrow">{track.track_code||"TRACK"} / SONG RECORD</span><h1>{track.working_title||"Untitled track"}</h1><p>One operational record from beat and credits through files, rights, spend, release, outcomes and lessons.</p></div><div className="date"><span>{String(track.development_status||track.status||"in development").replaceAll("_"," ")}</span></div></div>

    <section className="passport-kpis">
      <article><span>Stage</span><strong>{String(track.development_status||track.status||"in development").replaceAll("_"," ")}</strong></article>
      <article><span>Rights</span><strong className={rightsClean?"rights-clear":anyRightsBlocked?"rights-blocked":"rights-warn"}>{rightsClean?"CLEAN":anyRightsBlocked?"BLOCKED":"INCOMPLETE"}</strong></article>
      <article><span>Files</span><strong>{assets.length}{missingStems?" · STEMS MISSING":""}</strong></article>
      <article><span>Open Issues</span><strong>{openIssues.length}</strong></article>
      <article><span>Release</span><strong>{releases.some((r:any)=>r.release_status==="live")?"LIVE":"NOT LIVE"}</strong></article>
    </section>

    <section className="passport-grid">
      <article className="panel">
        <span className="eyebrow">PEOPLE</span><h2>Who did what</h2>
        {Object.entries(grouped).map(([label,rows]:any)=><div key={label}><h3>{label}</h3>{!rows.length&&<p>None recorded.</p>}<div className="passport-list">{rows.map((row:any)=><div className="passport-row" key={row.id}><span><strong>{creatorDisplayName(first(row.profiles))}</strong><small>{String(row.contribution_role).replaceAll("_"," ")}</small></span><span>{row.approved?"✓ FACKTS Verified":"Recorded"}</span>{canManage&&!row.approved&&<form action={approveTrackCredit}><input type="hidden" name="track_id" value={track.id}/><input type="hidden" name="credit_id" value={row.id}/><button>Verify credit</button></form>}</div>)}</div></div>)}
      </article>

      <article className="panel">
        <span className="eyebrow">SPLITS</span><h2>Agreed ownership</h2>
        <div className={`rights-total ${allSplitsConfirmed?"complete":""}`}><strong>{splitTotal}%</strong><span>{allSplitsConfirmed?"100% confirmed":"Not fully confirmed"}</span></div>
        <div className="passport-list">{splits.map((row:any)=><div className="passport-row" key={row.id}><span><strong>{creatorDisplayName(first(row.profiles))}</strong><small>{row.contribution_role}</small></span><b>{row.percentage}% · {String(row.status).replaceAll("_"," ")}</b></div>)}</div>
        <Link className="secondary-button-inline" href="/splits">Open Splits & Credits →</Link>
      </article>

      <article className="panel">
        <span className="eyebrow">FILES</span><h2>Version & asset history</h2>
        {!assets.length&&<p>No track files recorded.</p>}
        <div className="passport-list">{assets.map((asset:any)=><div className="passport-row" key={asset.id}><span><strong>{asset.file_name}</strong><small>{String(asset.asset_kind||"file").replaceAll("_"," ")} · {creatorDisplayName(first(asset.profiles))} · {new Date(asset.created_at).toLocaleDateString("en-KE")}</small>{asset.version_note&&<small>{asset.version_note}</small>}</span></div>)}</div>
      </article>

      <article className="panel">
        <span className="eyebrow">FINANCE</span><h2>What this track cost</h2>
        {[...spendByCurrency.entries()].map(([currency,amount])=><h3 key={currency}>{currency} {amount.toLocaleString("en-KE")} paid</h3>)}
        {!expenses.length&&<p>No track-specific expenses recorded.</p>}
        <div className="passport-list">{expenses.map((item:any)=><div className="passport-row" key={item.id}><span><strong>{item.category}</strong><small>{item.vendor||"Project expense"} · {item.expense_date}</small></span><b>{item.currency} {Number(item.amount).toLocaleString("en-KE")} · {item.payment_status}</b></div>)}</div>
        <Link className="secondary-button-inline" href="/finance">Open Finance →</Link>
      </article>

      <article className="panel passport-span">
        <span className="eyebrow">RIGHTS READINESS</span><h2>Is this track clean?</h2>
        <p>{rightsClean?"All required rights checks are clear/not applicable and splits are 100% confirmed.":"Do not treat this track as rights-clean until the checklist and split confirmations are complete."}</p>
        <div className="passport-list">{RIGHTS.map(([key,label])=>{const row:any=rightsMap.get(key);return<div className="passport-row" key={key}><span><strong>{label}</strong><small>{row?.evidence_note||"No evidence note recorded."}</small></span><b className={row?.status==="clear"||row?.status==="not_applicable"?"rights-clear":row?.status==="blocked"?"rights-blocked":"rights-warn"}>{String(row?.status||"pending").replaceAll("_"," ")}</b></div>})}</div>
        {canManage&&<details className="session-inline-tool"><summary>Update rights check +</summary><form action={saveRightsCheck} className="operations-form"><input type="hidden" name="track_id" value={track.id}/><select name="check_key" required defaultValue=""><option value="" disabled>Rights check</option>{RIGHTS.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select name="status" defaultValue="pending"><option value="pending">Pending</option><option value="clear">Clear</option><option value="not_applicable">Not applicable</option><option value="blocked">Blocked</option></select><input name="evidence_url" type="url" placeholder="Evidence link"/><textarea name="evidence_note" placeholder="What proves this?"/><button>Save rights check</button></form></details>}
      </article>

      <article className="panel">
        <span className="eyebrow">RELEASE</span><h2>Where it was released</h2>
        {!releases.length&&<p>No release record yet.</p>}
        <div className="passport-list">{releases.map((item:any)=><div className="passport-row" key={item.id}><span><strong>{item.platform_name}</strong><small>{item.distributor||"Distributor not recorded"} · {item.release_date||"Date pending"}{item.isrc?` · ISRC ${item.isrc}`:""}</small></span><b>{item.release_status}</b></div>)}</div>
        {canRelease&&<details className="session-inline-tool"><summary>Add release record +</summary><form action={addTrackRelease} className="operations-form"><input type="hidden" name="track_id" value={track.id}/><input name="platform_name" required placeholder="Spotify / Apple / YouTube / DSP"/><input name="distributor" placeholder="Distributor"/><input name="release_date" type="date"/><input name="isrc" placeholder="ISRC"/><input name="upc" placeholder="UPC"/><input name="release_url" type="url" placeholder="Release URL"/><select name="release_status" defaultValue="planned"><option value="planned">Planned</option><option value="submitted">Submitted</option><option value="live">Live</option><option value="taken_down">Taken down</option></select><textarea name="notes" placeholder="Release notes"/><button>Add release</button></form></details>}
      </article>

      <article className="panel">
        <span className="eyebrow">POST-RELEASE</span><h2>What happened after release</h2>
        {!events.length&&<p>No post-release events recorded.</p>}
        <div className="passport-list">{events.map((item:any)=><div className="passport-row" key={item.id}><span><strong>{String(item.event_type).replaceAll("_"," ")} · {item.organisation||"FACKTS Music"}</strong><small>{item.event_date} · {item.description}</small>{item.outcome&&<small>Outcome: {item.outcome}</small>}</span>{item.value!=null&&<b>{item.currency} {Number(item.value).toLocaleString("en-KE")}</b>}</div>)}</div>
        {canRelease&&<details className="session-inline-tool"><summary>Record post-release outcome +</summary><form action={addReleaseEvent} className="operations-form"><input type="hidden" name="track_id" value={track.id}/><select name="event_type" defaultValue="playlist"><option value="playlist">Playlist</option><option value="radio">Radio</option><option value="press">Press</option><option value="performance">Performance</option><option value="creator_campaign">Creator campaign</option><option value="chart">Chart</option><option value="sync">Sync</option><option value="brand">Brand</option><option value="milestone">Milestone</option><option value="audience_feedback">Audience feedback</option><option value="release_issue">Release issue</option><option value="other">Other</option></select><input name="event_date" type="date"/><input name="organisation" placeholder="Organisation / platform"/><textarea name="description" required placeholder="What happened?"/><textarea name="outcome" placeholder="What came from it?"/><input name="evidence_url" type="url" placeholder="Evidence link"/><input name="value" type="number" min="0" step="0.01" placeholder="Value if relevant"/><select name="currency" defaultValue="KES"><option>KES</option><option>USD</option></select><button>Record outcome</button></form></details>}
      </article>

      <article className="panel">
        <span className="eyebrow">COMMERCIAL RETURN</span><h2>Opportunities & revenue</h2>
        <p>{opportunities.length} opportunity record{opportunities.length===1?"":"s"} linked to this track.</p>
        <div className="passport-list">{opportunities.map((item:any)=><div className="passport-row" key={item.id}><span><strong>{item.organisation||item.opportunity_type}</strong><small>{item.revenue_pathway} · {String(item.status).replaceAll("_"," ")}</small></span>{item.estimated_value!=null&&<b>{item.currency} {Number(item.estimated_value).toLocaleString("en-KE")}</b>}</div>)}</div>
        {[...revenueByCurrency.entries()].map(([currency,amount])=><h3 key={currency}>{currency} {amount.toLocaleString("en-KE")} received</h3>)}
        <Link className="secondary-button-inline" href="/opportunities">Open Opportunities →</Link>
      </article>

      <article className="panel">
        <span className="eyebrow">STUDIO MEMORY</span><h2>Sessions & decisions</h2>
        {!sessions.length&&<p>No track-specific sessions recorded.</p>}
        <div className="passport-list">{sessions.map((s:any)=><div className="passport-row" key={s.id}><span><strong>{new Date(s.starts_at).toLocaleString("en-KE")}</strong><small>{s.location||"Location pending"} · {String(s.status).replaceAll("_"," ")}</small>{s.outcomes&&<small>{s.outcomes}</small>}</span></div>)}</div>
        <Link className="secondary-button-inline" href="/studio-sessions">Open Studio Sessions →</Link>
      </article>

      <article className="panel passport-span">
        <span className="eyebrow">ISSUES & LESSONS</span><h2>What went wrong — and what we learned</h2>
        {!issues.length&&<p>No operational issues recorded yet.</p>}
        <div className="passport-list">{issues.map((issue:any)=><div className="passport-row" key={issue.id}><span><strong>{issue.title}</strong><small>{String(issue.category).replaceAll("_"," ")} · {issue.severity} · {String(issue.status).replaceAll("_"," ")}</small><p>{issue.description}</p>{issue.resolution&&<small>Resolution: {issue.resolution}</small>}{issue.lesson_learned&&<small>Lesson: {issue.lesson_learned}</small>}</span>{canManage&&<details><summary>Resolve / learn +</summary><form action={updateOperationalIssue} className="operations-form"><input type="hidden" name="issue_id" value={issue.id}/><input type="hidden" name="track_id" value={track.id}/><select name="status" defaultValue={issue.status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="accepted_risk">Accepted risk</option></select><select name="owner_id" defaultValue={issue.owner_id||""}><option value="">No owner</option>{members.map((m:any)=><option key={m.user_id} value={m.user_id}>{creatorDisplayName(first(m.profiles))}</option>)}</select><textarea name="resolution" defaultValue={issue.resolution||""} placeholder="How was it resolved?"/><textarea name="lesson_learned" defaultValue={issue.lesson_learned||""} placeholder="What should we do differently next time?"/><button>Save resolution</button></form></details>}</div>)}</div>

        <details className="session-inline-tool"><summary>Log an issue / lesson +</summary><form action={addOperationalIssue} className="operations-form"><input type="hidden" name="track_id" value={track.id}/><select name="category" defaultValue="communication">{ISSUE_CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input name="title" required placeholder="Short issue title"/><textarea name="description" required placeholder="What actually happened?"/><select name="severity" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><select name="owner_id" defaultValue=""><option value="">No owner yet</option>{members.map((m:any)=><option key={m.user_id} value={m.user_id}>{creatorDisplayName(first(m.profiles))}</option>)}</select><input name="occurred_at" type="datetime-local"/><input name="due_date" type="date"/><button>Log issue</button></form></details>
      </article>
    </section>
  </div></AppShell>;
}
