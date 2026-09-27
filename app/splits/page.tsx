import Link from "next/link";
import AppShell from "../../components/AppShell";
import SplitPlanEditor, { SplitAction } from "../../components/SplitPlanEditor";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { projectLink } from "../../lib/navigation";
const first = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function SplitsPage({ searchParams }: { searchParams: Promise<{track?: string; view?: string; q?: string}> }) {
  const params = await searchParams;
  const { admin, user, project, membership, roles, activeProjects } = await getWorkspace();
  if (params.view === "mine") {
    const {data, error} = await admin.from("track_splits").select("id,track_id,project_id,percentage,tracks(working_title),projects(name)").eq("contributor_id",user.id).eq("status","awaiting_confirmation").in("project_id",activeProjects.length ? activeProjects.map((p:any)=>p.id) : ["00000000-0000-0000-0000-000000000000"]);
    return <AppShell><div className="content"><h1>Splits to review</h1>{error ? <p role="alert">We couldn’t load your shares. Please refresh or contact support.</p> : !data?.length ? <p>No shares are waiting for your confirmation.</p> : data.map((row:any)=><article className="panel" key={row.id}><h2>{first(row.tracks)?.working_title || "Song"}</h2><p>{first(row.projects)?.name} · Your share: {row.percentage}%</p><Link href={projectLink(row.project_id,`/splits?track=${row.track_id}`)}>Review complete proposal →</Link></article>)}<Link href="/home">Back to home</Link></div></AppShell>;
  }
  if (!project || !membership) return <AppShell><div className="content"><h1>Credits & Splits</h1><p>Join or open a project to review its song splits.</p><Link href="/projects">Open my projects →</Link></div></AppShell>;
  const [tracksR, membersR, splitsR, plansR] = await Promise.all([
    admin.from("tracks").select("id,working_title,track_code").eq("project_id",project.id).order("working_title"),
    admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).eq("status","active"),
    admin.from("track_splits").select("id,track_id,contributor_id,contribution_role,percentage,status,confirmed_at,profiles!track_splits_contributor_id_fkey(full_name,stage_name,nickname)").eq("project_id",project.id).order("created_at"),
    admin.from("track_split_plans").select("track_id,version,status").eq("project_id",project.id),
  ]);
  const error = tracksR.error || membersR.error || splitsR.error || plansR.error;
  if (error) {
    console.error("Splits load failed",error.code);
    return <AppShell><div className="content"><h1>Credits & Splits</h1><div role="alert" className="panel"><h2>We couldn’t load the split proposals</h2><p>Your saved shares have not been changed. Please refresh or ask the project administrator to check the split-workflow database upgrade.</p><Link href="/splits">Try again →</Link></div></div></AppShell>;
  }
  const tracks = tracksR.data || [], splits = splitsR.data || [], plans = plansR.data || [];
  const selected = params.track ? tracks.find((track:any)=>track.id===params.track) : null;
  const canManage = hasAnyRole(roles,["Super Admin","Admin","Project Lead","Project Admin"]);
  const members = (membersR.data || []).map((member:any)=>({id:member.user_id,name:creatorDisplayName(first(member.profiles))}));
  const filtered = tracks.filter((track:any)=>`${track.working_title} ${track.track_code}`.toLowerCase().includes((params.q || "").toLowerCase()));
  return <AppShell><div className="content splits-page">
    <div className="heading"><div><span className="eyebrow">{project.name}</span><h1>Credits & Splits</h1><p>Credits record who did the work. Splits record the agreed percentages.</p></div><Link href="/splits?view=mine">My pending approvals →</Link></div>
    {params.track && !selected ? <div className="panel"><h2>Song not found in this project</h2><Link href="/splits">View this project’s songs →</Link></div> : !selected ? <>
      <form method="get" className="split-search"><label>Find a song<input type="search" name="q" defaultValue={params.q || ""} placeholder="Song title or code"/></label><button>Search</button></form>
      {!filtered.length && <p>No songs found.</p>}
      {filtered.map((track:any)=>{const rows=splits.filter((s:any)=>s.track_id===track.id);const total=rows.reduce((sum:number,s:any)=>sum+Number(s.percentage),0);const mine=rows.some((s:any)=>s.contributor_id===user.id&&s.status==="awaiting_confirmation");return <article className="panel split-summary" key={track.id}><div><h2>{track.working_title || "Untitled song"}</h2><p>{total.toFixed(2)}% allocated · {rows.filter((s:any)=>s.status==="confirmed").length}/{rows.length} shares confirmed{mine?" · Your review is needed":""}</p></div><Link href={`/splits?track=${track.id}`}>{mine?"Review my share":"Open proposal"} →</Link></article>;})}
    </> : (()=>{
      const rows=splits.filter((row:any)=>row.track_id===selected.id);
      const plan=plans.find((p:any)=>p.track_id===selected.id);
      const version=plan?.version || 0, status=plan?.status || "draft";
      const total=rows.reduce((sum:number,row:any)=>sum+Math.round(Number(row.percentage)*100),0)/100;
      const context={projectId:project.id,trackId:selected.id,version};
      return <section className="panel split-detail"><Link href="/splits">← All songs</Link><h2>{selected.working_title}</h2><p><strong>{total.toFixed(2)}% allocated</strong> · {String(status).replaceAll("_"," ")} · Version {version}</p><Link href={`/track-records/${selected.id}`}>Song details, credits & files →</Link>
        <p>Review the full proposal before confirming your share. A revision or change request resets all approvals.</p>
        <div className="split-table-wrap"><table><thead><tr><th>Contributor</th><th>Role</th><th>Share</th><th>Status</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.id}><td>{creatorDisplayName(first(row.profiles))}{row.contributor_id===user.id?" (you)":""}</td><td>{row.contribution_role}</td><td>{row.percentage}%</td><td>{row.status.replaceAll("_"," ")}</td></tr>)}</tbody></table></div>
        {!rows.length && <p>No shares drafted yet. Project management can add the contributors below.</p>}
        {rows.filter((row:any)=>row.contributor_id===user.id).map((row:any)=><div key={`${row.id}-${version}`} className="split-my-share">{row.status==="awaiting_confirmation" && <SplitAction context={context} operation="confirm" splitId={row.id} label={`Confirm my ${row.percentage}% (${row.contribution_role})`}/>} {status!=="draft" && <details><summary>Request a change to my share</summary><SplitAction context={context} operation="request_change" splitId={row.id} label="Send change request"/></details>}</div>)}
        {canManage && <><details className="split-edit-disclosure" open={status==="draft"}><summary>Edit allocation table</summary><SplitPlanEditor key={`${selected.id}-${version}`} context={context} status={status} members={members} initialRows={rows.map((row:any)=>({contributor_id:row.contributor_id,contribution_role:row.contribution_role,percentage:String(row.percentage)}))}/></details></>}
      </section>;
    })()}
  </div></AppShell>;
}
