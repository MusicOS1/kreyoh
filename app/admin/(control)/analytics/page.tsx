import { createAdminClient } from "../../../../lib/supabase/admin";

const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = [7, 30, 90].includes(Number(range)) ? Number(range) : 30;
  const admin = createAdminClient();
  const [{ data: events }, { count: newUsers }, { count: activeUsers }, { data: claims }, { data: projects }] = await Promise.all([
    admin.from("platform_events").select("event_name,category,user_id,project_id,created_at").gte("created_at", since(days)),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since(days)),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_at", since(days)),
    admin.from("beat_claims").select("beat_id,status").gte("claimed_at", since(days)),
    admin.from("projects").select("id,name,platform_events(id)"),
  ]);
  const safeEvents = events || [];
  const counts = safeEvents.reduce((map: Record<string, number>, event: any) => { map[event.event_name] = (map[event.event_name] || 0) + 1; return map; }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const plays = counts.beat_played || 0, claimClicks = counts.beat_claim_clicked || 0, successful = (claims || []).length;
  const maximum = Math.max(1, ...top.map((item) => item[1]));
  return <><section className="control-page-hero analytics"><span className="control-eyebrow">USEFUL ANALYTICS</span><h1>See what is actually working.</h1><p>Real product usage from the last {days} days. Empty data remains honestly empty.</p></section><nav className="control-pills">{[7, 30, 90].map(day => <a className={day === days ? "active" : ""} href={`/admin/analytics?range=${day}`} key={day}>{day} days</a>)}</nav><section className="control-metrics"><article><span>Active users</span><strong>{activeUsers || 0}</strong><small>Period activity</small></article><article><span>New users</span><strong>{newUsers || 0}</strong><small>New profiles</small></article><article><span>Beat plays</span><strong>{plays}</strong><small>Tracked plays</small></article><article><span>Claim clicks</span><strong>{claimClicks}</strong><small>Intent recorded</small></article><article><span>Successful claims</span><strong>{successful}</strong><small>Claim records</small></article><article><span>Play → claim</span><strong>{plays ? Math.round(successful / plays * 100) : 0}%</strong><small>Simple conversion</small></article></section><section className="control-grid"><article className="control-panel"><header><div><span className="control-eyebrow">TOP EVENTS</span><h2>Most common movement</h2></div></header>{!top.length ? <p className="control-empty">No analytics events recorded yet.</p> : top.map(([name, count]) => <div className="control-bar" key={name}><span>{name.replaceAll("_", " ")}</span><i style={{ width: `${Math.max(8, Math.min(100, count / maximum * 100))}%` }} /><strong>{count}</strong></div>)}</article><article className="control-panel"><header><div><span className="control-eyebrow">PROJECT SIGNAL</span><h2>Event volume</h2></div></header>{(projects || []).map((project: any) => <div className="control-row" key={project.id}><span className="control-project-code">PROJECT</span><div><strong>{project.name}</strong><small>Meaningful recorded events</small></div><b>{project.platform_events?.length || 0}</b></div>)}</article></section></>;
}
