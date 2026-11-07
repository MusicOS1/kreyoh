import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";

const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = [7, 30, 90].includes(Number(range)) ? Number(range) : 30;
  const admin = createAdminClient();
  const [{ data: events,error:eventsError }, { count: newUsers,error:newUsersError }, { count: activeUsers,error:activeUsersError }, { data: claims,error:claimsError }, { data: projects,error:projectsError }, {data:authActivity,error:authError},{data:authHistory,error:historyError}] = await Promise.all([
    admin.from("platform_events").select("event_name,category,user_id,project_id,created_at").gte("created_at", since(days)),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(days)),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_at", since(days)),
    admin.from("beat_claims").select("beat_id,status").gte("claimed_at", since(days)),
    admin.from("projects").select("id,name,platform_events(id)"),
    admin.from("platform_events").select("id,event_name,metadata,created_at").eq("category","authentication").gte("created_at",since(days)).order("created_at",{ascending:false}).limit(3000),
    admin.from("auth_events").select("id,event_name,created_at").gte("created_at",since(days)).order("created_at",{ascending:false}).limit(3000),
  ]);
  if(eventsError||newUsersError||activeUsersError||claimsError||projectsError||authError||historyError)
    return <section className="control-panel"><h1>Analytics unavailable</h1><p role="alert">Some records could not be read. Missing data must not be displayed as zero.</p><Link href="/admin/analytics">Retry analytics</Link></section>;

  // Music streaming analytics are distinct from beat plays and fan votes.
  // The existing database RPC counts qualified sessions; absent instrumentation is never backfilled.
  const fromDate=since(days).slice(0,10),toDate=new Date().toISOString().slice(0,10);
  const {data:musicStats,error:musicError}=await admin.rpc("public_music_play_stats",{
   p_from:fromDate,p_to:toDate
  });
  type MusicStat={releaseId:string;lifetime:number;period:number;starts:number;listeners:number;lastPlay:string|null};
  const stats:MusicStat[]=(musicStats||[]).map((row:any)=>({
   releaseId:String(row.release_id),lifetime:Number(row.lifetime_plays||0),
   period:Number(row.period_plays||0),starts:Number(row.period_starts||0),
   listeners:Number(row.period_listeners||0),lastPlay:row.last_play_at
  })).sort((a:MusicStat,b:MusicStat)=>b.lifetime-a.lifetime);
  const musicIds=stats.map((item:MusicStat)=>item.releaseId);
  const {data:musicReleases,error:musicNamesError}=musicIds.length
   ?await admin.from("music_releases").select("id,title,artist_name").in("id",musicIds)
   :{data:[],error:null};
  const names=new Map((musicReleases||[]).map((item:{id:string;title:string;artist_name:string})=>[item.id,item]));
  const totalMusicPlays=stats.reduce((sum:number,item:MusicStat)=>sum+item.lifetime,0);
  const periodMusicPlays=stats.reduce((sum:number,item:MusicStat)=>sum+item.period,0);
  const periodMusicStarts=stats.reduce((sum:number,item:MusicStat)=>sum+item.starts,0);
  const auth=authActivity||[];
  const attempted=auth.filter(e=>e.event_name==="login_attempted");
  const failed=auth.filter(e=>e.event_name==="login_failed"||e.event_name==="login_access_denied");
  const resetRequested=auth.filter(e=>e.event_name==="password_reset_requested");
  const resetSendFailed=auth.filter(e=>e.event_name==="password_reset_request_failed");
  const recoveryFailed=auth.filter(e=>e.event_name==="password_recovery_failed");
  const passwordChanged=auth.filter(e=>e.event_name==="password_change_completed");
  const recoveryCauses=Object.entries(recoveryFailed.reduce((all:Record<string,number>,e)=>{
    const reason=String((e.metadata as Record<string,unknown>|null)?.reason||"unknown");
    all[reason]=(all[reason]||0)+1;return all;
  },{})).sort((a,b)=>b[1]-a[1]);
  const loginCauses=Object.entries(failed.reduce((all:Record<string,number>,e)=>{
    const reason=String((e.metadata as Record<string,unknown>|null)?.reason||"unknown");
    all[reason]=(all[reason]||0)+1;return all;
  },{})).sort((a,b)=>b[1]-a[1]);
  const safeEvents = events || [];
  const counts = safeEvents.reduce((map: Record<string, number>, event: any) => { map[event.event_name] = (map[event.event_name] || 0) + 1; return map; }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const plays = counts.beat_played || 0, claimClicks = counts.beat_claim_clicked || 0, successful = (claims || []).length;
  const maximum = Math.max(1, ...top.map((item) => item[1]));
  return <><section className="control-page-hero analytics"><span className="control-eyebrow">USEFUL ANALYTICS</span><h1>See what is actually working.</h1><p>Real product usage from the last {days} days. Empty data remains honestly empty.</p><Link href="/admin/diagnostics">Open login failures, timeouts and incident diagnostics →</Link></section><nav className="control-pills">{[7, 30, 90].map(day => <a className={day === days ? "active" : ""} href={`/admin/analytics?range=${day}`} key={day}>{day} days</a>)}</nav><section className="control-metrics"><article><span>Active users</span><strong>{activeUsers || 0}</strong><small>Period activity</small></article><article><span>New users</span><strong>{newUsers || 0}</strong><small>New profiles</small></article><article><span>Login attempts</span><strong>{attempted.length}</strong><small>Recorded login submissions</small></article><article><span>Failed logins</span><strong>{failed.length}</strong><small>Includes invalid credentials</small></article><article><span>Successful logins</span><strong>{(authHistory||[]).filter(e=>e.event_name==="login_completed").length}</strong><small>Recorded successful sign-ins</small></article><article><span>Reset requests</span><strong>{resetRequested.length}</strong><small>Recorded email requests</small></article><article><span>Reset email failures</span><strong>{resetSendFailed.length}</strong><small>Email service or rate-limit errors</small></article><article><span>Recovery link failures</span><strong>{recoveryFailed.length}</strong><small>Reported link/verification failures</small></article><article><span>Password changes</span><strong>{passwordChanged.length}</strong><small>Reported completed updates</small></article><article><span>Beat plays</span><strong>{plays}</strong><small>Tracked plays</small></article><article><span>Claim clicks</span><strong>{claimClicks}</strong><small>Intent recorded</small></article><article><span>Successful claims</span><strong>{successful}</strong><small>Claim records</small></article><article><span>Play → claim</span><strong>{plays ? Math.round(successful / plays * 100) : 0}%</strong><small>Simple conversion</small></article></section>
  <section className="control-panel fm-music-analytics" aria-labelledby="fm-song-analytics-title">
   <header><div><span className="control-eyebrow">FACKTS MUSIC · STREAMING INTELLIGENCE</span>
    <h2 id="fm-song-analytics-title">Actual song plays</h2></div>
    <Link href="/admin/releases">Manage releases →</Link>
   </header>
   {musicError||musicNamesError?<p role="alert">Song-play analytics are unavailable. No zero counts have been substituted.</p>:<>
    <div className="fm-song-stats-summary">
     <article><span>Recorded lifetime plays</span><strong>{totalMusicPlays.toLocaleString()}</strong></article>
     <article><span>Qualified plays · {days} days</span><strong>{periodMusicPlays.toLocaleString()}</strong></article>
     <article><span>Listening sessions started · {days} days</span><strong>{periodMusicStarts.toLocaleString()}</strong></article>
    </div>
    <p className="fm-music-analytics-note">A play qualifies after meaningful listening, with repeat plays deduplicated. Counts include only sessions actually recorded since instrumentation started; earlier untracked listening cannot be reconstructed.</p>
    <div className="fm-music-play-table" role="table" aria-label="Song-level listening counts">
     <div className="fm-music-play-head" role="row"><span role="columnheader">Published release</span><span role="columnheader">Lifetime plays</span><span role="columnheader">{days}-day plays</span></div>
     {stats.map((item:MusicStat)=><div className="fm-music-play-row" role="row" key={item.releaseId}>
      <span role="cell"><strong>{names.get(item.releaseId)?.title||"Release"}</strong><small>{names.get(item.releaseId)?.artist_name||""}</small></span>
      <b role="cell">{item.lifetime.toLocaleString()}</b><b role="cell">{item.period.toLocaleString()}</b>
     </div>)}
     {!stats.length&&<p>No published releases are currently eligible for listening analytics.</p>}
    </div>
   </>}
  </section>
  <section className="control-grid"><article className="control-panel"><header><div><span className="control-eyebrow">TOP EVENTS</span><h2>Most common movement</h2></div></header>{!top.length ? <p className="control-empty">No analytics events recorded yet.</p> : top.map(([name, count]) => <div className="control-bar" key={name}><span>{name.replaceAll("_", " ")}</span><i style={{ width: `${Math.max(8, Math.min(100, count / maximum * 100))}%` }} /><strong>{count}</strong></div>)}</article><article className="control-panel"><header><div><span className="control-eyebrow">PROJECT SIGNAL</span><h2>Event volume</h2></div></header>{(projects || []).map((project: any) => <div className="control-row" key={project.id}><span className="control-project-code">PROJECT</span><div><strong>{project.name}</strong><small>Meaningful recorded events</small></div><b>{project.platform_events?.length || 0}</b></div>)}</article></section><section className="control-grid"><article className="control-panel">
   <header><div><span className="control-eyebrow">ACCOUNT ACCESS</span><h2>Failed login reasons</h2></div><Link href="/admin/diagnostics">View diagnostics</Link></header>
   {loginCauses.length?loginCauses.map(([reason,count])=><div className="control-row" key={reason}><div><strong>{reason.replaceAll("_"," ")}</strong></div><b>{count}</b></div>):<p>No failed logins recorded in this period.</p>}
  </article><article className="control-panel">
   <header><div><span className="control-eyebrow">PASSWORD RECOVERY</span><h2>Why recovery links fail</h2></div></header>
   {recoveryCauses.length?recoveryCauses.map(([reason,count])=><div className="control-row" key={reason}><div><strong>{reason.replaceAll("_"," ")}</strong></div><b>{count}</b></div>):<p>No recovery failures have been captured yet. Earlier link failures cannot be reconstructed.</p>}
  </article></section>
  <p className="control-empty">Authentication and recovery counts include only events recorded by Kreyoh. Client-reported recovery outcomes are diagnostic signals, not independently verified sign-ins or completed password changes. Historical failures before instrumentation cannot be inferred.</p></>;
}
