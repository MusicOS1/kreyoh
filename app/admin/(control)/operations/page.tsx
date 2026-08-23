import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
const label = (value?: string) => (value || "pending").replaceAll("_", " ");

export default async function AdminOperations() {
  const admin = createAdminClient();
  const [{ data: beats = [] }, { data: tracks = [] }, { data: sessions = [] }, { data: tasks = [] }] = await Promise.all([
    admin.from("beats").select("id,title,beat_code,producer_name,status,created_at,projects(name)").order("created_at", { ascending: false }).limit(8),
    admin.from("tracks").select("id,working_title,track_code,development_status,created_at,projects(name)").order("created_at", { ascending: false }).limit(8),
    admin.from("studio_sessions").select("id,starts_at,location,status,projects(name),tracks(working_title)").order("starts_at", { ascending: false }).limit(8),
    admin.from("project_tasks").select("id,title,status,due_date,projects(name),profiles!project_tasks_assignee_id_fkey(full_name,stage_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  const safeBeats = beats || [], safeTracks = tracks || [], safeSessions = sessions || [], safeTasks = tasks || [];
  const sections = [
    { title: "Beat library", eyebrow: "MUSIC INTAKE", href: "/beats", items: safeBeats.map((item: any) => ({ id: item.id, name: item.title || item.beat_code || "Untitled beat", meta: `${item.producer_name || "Producer pending"} / ${first(item.projects)?.name || "No project"}`, status: item.status })) },
    { title: "Tracks in development", eyebrow: "CATALOGUE", href: "/tracks", items: safeTracks.map((item: any) => ({ id: item.id, name: item.working_title || item.track_code || "Untitled track", meta: first(item.projects)?.name || "No project", status: item.development_status })) },
    { title: "Studio sessions", eyebrow: "ROOMS", href: "/studio-sessions", items: safeSessions.map((item: any) => ({ id: item.id, name: first(item.tracks)?.working_title || "Project session", meta: `${new Date(item.starts_at).toLocaleString("en-KE")} / ${item.location || "Location pending"}`, status: item.status })) },
    { title: "Actions and delivery", eyebrow: "WORK", href: "/tasks", items: safeTasks.map((item: any) => ({ id: item.id, name: item.title, meta: `${first(item.profiles)?.stage_name || first(item.profiles)?.full_name || "Unassigned"}${item.due_date ? ` / due ${item.due_date}` : ""}`, status: item.status })) },
  ];
  return <>
    <section className="control-page-hero operations"><span className="control-eyebrow">MUSIC OPERATIONS</span><h1>Manage more than accounts.</h1><p>See the music, tracks, studio rooms and delivery work moving across FACKTS Music. Day-to-day edits remain with authorised project teams; the Control Room keeps the whole system visible.</p></section>
    <section className="control-operation-grid">{sections.map(section => <article className="control-panel" key={section.title}><header><div><span className="control-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2></div><Link href={section.href}>Open workspace</Link></header><div className="control-table">{!section.items.length && <p className="control-empty">No records yet.</p>}{section.items.map(item => <div className="control-row" key={item.id}><span className="control-activity-dot"/><div><strong>{item.name}</strong><small>{item.meta}</small></div><span className="control-status">{label(item.status)}</span></div>)}</div></article>)}</section>
  </>;
}
