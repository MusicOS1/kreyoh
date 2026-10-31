import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
const time = (value: string) => new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date(value));
const valueOf = (x: unknown) => typeof x === "string" ? x : "unknown";
const countBy = (items: string[]) => Object.entries(items.reduce((m: Record<string, number>, item) => { m[item] = (m[item] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

export default async function AdminDiagnostics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  const days = [1, 7, 30].includes(Number(params.days)) ? Number(params.days) : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const admin = createAdminClient();
  const [authResult, incidentResult, failuresResult] = await Promise.all([
    admin.from("auth_events").select("id,event_name,metadata,user_id,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(3000),
    admin.from("system_incidents").select("id,severity,source,message,context,created_at,resolved_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    admin.from("platform_events").select("id,event_name,metadata,user_id,created_at").eq("category","authentication").gte("created_at",since).order("created_at",{ascending:false}).limit(3000),
  ]);
  if (authResult.error || incidentResult.error || failuresResult.error) return <section className="control-panel"><h1>Diagnostics unavailable</h1><p role="alert">The event history could not be read. Do not interpret missing data as zero incidents.</p><Link href="/admin/diagnostics">Retry</Link></section>;

  const auth = [...(authResult.data || []), ...(failuresResult.data || [])], incidents = incidentResult.data || [];
  const attempted = auth.filter(e => e.event_name === "login_attempted");
  const successes = auth.filter(e => e.event_name === "login_completed");
  const failed = auth.filter(e => e.event_name === "login_failed" || e.event_name === "login_access_denied");
  const reasons = countBy(failed.map(e => valueOf((e.metadata as Record<string, unknown> | null)?.reason)));
  const surfaces = countBy(failed.map(e => valueOf((e.metadata as Record<string, unknown> | null)?.surface)));
  const timeoutCount = failed.filter(e => ["timeout", "network", "service_unavailable"].includes(valueOf((e.metadata as Record<string, unknown> | null)?.reason))).length;
  const open = incidents.filter(e => !e.resolved_at);
  const sources = countBy(incidents.map(e => e.source));
  const routes = countBy(incidents.map(e => valueOf((e.context as Record<string, unknown> | null)?.route)).filter(v => v !== "unknown"));
  const daysRows = Array.from({ length: Math.min(days, 30) }, (_, idx) => {
    const day = new Date(Date.now() - (Math.min(days, 30) - idx - 1) * 86400000).toISOString().slice(0, 10);
    return { day, attempts: attempted.filter(e => e.created_at.slice(0, 10) === day).length, fails: failed.filter(e => e.created_at.slice(0, 10) === day).length, incidents: incidents.filter(e => e.created_at.slice(0, 10) === day).length };
  });
  const peak = Math.max(1, ...daysRows.map(d => d.attempts + d.incidents));
  const rate = attempted.length ? Math.round(failed.length / attempted.length * 100) : null;
  return <>
    <section className="control-page-hero analytics"><span className="control-eyebrow">PLATFORM DIAGNOSTICS</span><h1>See what failed, and where.</h1><p>Login attempts, rejected credentials, service interruptions and application incidents. Only recorded events are counted.</p></section>
    <nav className="control-pills">{[1,7,30].map(d => <Link className={d === days ? "active" : ""} href={"/admin/diagnostics?days=" + d} key={d}>{d === 1 ? "24 hours" : d + " days"}</Link>)}</nav>
    <section className="control-metrics">
      {([
        ["Login attempts", attempted.length, "New instrumentation only"],
        ["Successful logins", successes.length, "Historical and new records"],
        ["Failed logins", failed.length, "Recorded failed submissions"],
        ["Failure rate", rate === null ? "—" : rate + "%", "Recorded attempts only"],
        ["Network / timeout failures", timeoutCount, "Classification, not a raw trace"],
        ["Application incidents", incidents.length, "Recorded system and browser failures"],
        ["Unresolved incidents", open.length, "Requires investigation"],
      ] as const).map(([title, count, note]) => <article key={title}><span>{title}</span><strong>{count}</strong><small>{note}</small></article>)}
    </section>
    <section className="control-grid">
      <article className="control-panel"><header><div><span className="control-eyebrow">CAUSES</span><h2>Why login attempts fail</h2></div></header>{!reasons.length ? <p className="control-empty">No recorded failed submissions in this period.</p> : reasons.map(([reason,count]) => <div className="control-row" key={reason}><div><strong>{label(reason)}</strong><small>Classified authentication failure</small></div><b>{count}</b></div>)}</article>
      <article className="control-panel"><header><div><span className="control-eyebrow">APPLICATION</span><h2>Where problems occur</h2></div></header>{!sources.length ? <p className="control-empty">No application incidents recorded in this period.</p> : sources.map(([source,count]) => <div className="control-row" key={source}><div><strong>{label(source)}</strong><small>Recorded incident source</small></div><b>{count}</b></div>)}<p>Login surfaces: {surfaces.map(([name, count]) => label(name) + " (" + count + ")").join(" · ") || "No failures recorded"}.</p></article>
    </section>
    <section className="control-grid">
      <article className="control-panel"><header><div><span className="control-eyebrow">TREND</span><h2>Recorded daily activity</h2></div></header>{daysRows.map(d => <div className="control-bar" key={d.day}><span>{d.day}</span><i style={{ width: Math.max(2, (d.attempts + d.incidents) / peak * 100) + "%" }} /><strong>{d.attempts} attempts · {d.fails} failed · {d.incidents} incidents</strong></div>)}</article>
      <article className="control-panel"><header><div><span className="control-eyebrow">ROUTES</span><h2>Most affected screens</h2></div></header>{!routes.length ? <p className="control-empty">No screen-level errors captured yet.</p> : routes.slice(0,10).map(([route,count]) => <div className="control-row" key={route}><div><strong>{route}</strong></div><b>{count}</b></div>)}</article>
    </section>
    <section className="control-panel"><header><div><span className="control-eyebrow">INVESTIGATION LOG</span><h2>Latest recorded incidents</h2></div><Link href="/admin/system">System settings</Link></header>{!incidents.length ? <p className="control-empty">No incidents recorded. That is not proof the platform has had no errors.</p> : incidents.slice(0,100).map(e => <div className="control-row" key={e.id}><span className="control-status">{e.resolved_at ? "Resolved" : e.severity}</span><div><strong>{label(e.source)}</strong><small>{label(valueOf((e.context as Record<string, unknown> | null)?.reason))} · {valueOf((e.context as Record<string, unknown> | null)?.route)}</small></div><time>{time(e.created_at)}</time></div>)}</section>
    <p className="control-empty">Coverage: sign-ins through FACKTS forms, client runtime and rendering failures for authenticated accounts, and explicitly instrumented service failures. This is not a full log of every Supabase/Vercel server event. Events before instrumentation cannot be recovered, and these lists are capped at 3,000 records per authentication source and 1,000 incident records per period.</p>
  </>;
}
