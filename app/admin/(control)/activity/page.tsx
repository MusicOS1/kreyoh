import { createAdminClient } from "../../../../lib/supabase/admin";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
const nice = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
const categoryMap: Record<string, string[]> = { projects: ["projects", "project"], beats: ["beats", "music", "engagement", "collaboration"], sessions: ["sessions", "session"], files: ["files", "file"], admin: ["admin", "system"] };

export default async function AdminActivity({ searchParams }: { searchParams: Promise<{ category?: string; user?: string; project?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const category = params.category || "all";
  const admin = createAdminClient();
  let eventQuery = admin.from("platform_events").select("id,event_name,category,metadata,created_at,user_id,project_id,profiles(full_name,stage_name),projects(name)").order("created_at", { ascending: false }).limit(150);
  if (category !== "all" && category !== "authentication") eventQuery = eventQuery.in("category", categoryMap[category] || [category]);
  if (params.user) eventQuery = eventQuery.eq("user_id", params.user);
  if (params.project) eventQuery = eventQuery.eq("project_id", params.project);
  if (params.from) eventQuery = eventQuery.gte("created_at", new Date(`${params.from}T00:00:00`).toISOString());
  if (params.to) eventQuery = eventQuery.lte("created_at", new Date(`${params.to}T23:59:59`).toISOString());
  const [{ data: events = [] }, { data: auth = [] }, { data: users = [] }, { data: projects = [] }] = await Promise.all([
    eventQuery,
    category === "all" || category === "authentication" ? admin.from("auth_events").select("id,event_name,created_at,user_id,profiles(full_name,stage_name,email)").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    admin.from("profiles").select("id,full_name,stage_name,email").order("full_name").limit(200),
    admin.from("projects").select("id,name").order("name"),
  ]);
  if (!events || !auth || !users || !projects) throw new Error("Control Room activity data could not be loaded.");
  const filteredAuth = (auth || []).filter((event: any) => (!params.user || event.user_id === params.user) && (!params.from || +new Date(event.created_at) >= +new Date(`${params.from}T00:00:00`)) && (!params.to || +new Date(event.created_at) <= +new Date(`${params.to}T23:59:59`)));
  const feed = [...(category === "authentication" ? [] : events).map((event: any) => ({ ...event, kind: event.category })), ...filteredAuth.map((event: any) => ({ ...event, kind: "authentication" }))].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  return <><section className="control-page-hero activity"><span className="control-eyebrow">PLATFORM ACTIVITY</span><h1>Meaningful movement.</h1><p>Authentication, project, beat, session and system events—without meaningless click noise.</p></section><nav className="control-pills">{["all", "authentication", "projects", "beats", "sessions", "files", "admin"].map(item => <a key={item} className={category === item ? "active" : ""} href={`/admin/activity?category=${item}`}>{nice(item)}</a>)}</nav><section className="control-panel"><form className="control-filter control-filter-wide"><input type="hidden" name="category" value={category} /><select name="user" defaultValue={params.user || ""}><option value="">All users</option>{users.map((user: any) => <option value={user.id} key={user.id}>{user.stage_name || user.full_name || user.email}</option>)}</select><select name="project" defaultValue={params.project || ""}><option value="">All projects</option>{projects.map((project: any) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input type="date" name="from" defaultValue={params.from} aria-label="From date" /><input type="date" name="to" defaultValue={params.to} aria-label="To date" /><button>Apply Filters</button></form></section><section className="control-panel"><div className="control-event-feed">{!feed.length && <p className="control-empty">No events in this filter yet.</p>}{feed.map((event: any) => { const profile = first(event.profiles); const project = first(event.projects); return <article key={`${event.kind}-${event.id}`}><span className="control-activity-dot" /><div><strong>{nice(event.event_name)}</strong><p>{profile?.stage_name || profile?.full_name || profile?.email || "System"}{project ? ` · ${project.name}` : ""}</p></div><time>{new Date(event.created_at).toLocaleString("en-KE")}</time></article>; })}</div></section></>;
}
