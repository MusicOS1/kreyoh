import { notFound } from "next/navigation";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { addUsersToManagedProject, removeManagedMember, restoreManagedMember } from "../../actions";

const first = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function AdminUserProfile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const admin = createAdminClient();
  const [{ data: user }, { data: projects = [] }, { data: roles = [] }, { data: events = [] }, { count: uploads }, { count: claims }, { count: tasks }] = await Promise.all([
    admin.from("profiles").select("*,project_members(id,status,projects(id,name),member_roles(roles(name)))").eq("id", userId).maybeSingle(),
    admin.from("projects").select("id,name").order("name"),
    admin.from("roles").select("name").not("name", "in", "(Admin,Super Admin,Control Room Admin)").order("name"),
    admin.from("platform_events").select("id,event_name,category,created_at,projects(name)").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    admin.from("beats").select("id", { count: "exact", head: true }).eq("created_by", userId),
    admin.from("beat_claims").select("id", { count: "exact", head: true }).eq("artist_id", userId),
    admin.from("project_tasks").select("id", { count: "exact", head: true }).eq("assignee_id", userId).eq("status", "done"),
  ]);
  if (!projects || !roles || !events) throw new Error("Control Room user details could not be loaded.");
  if (!user) notFound();
  const active = (user.project_members || []).filter((member: any) => member.status === "active");
  const removed = (user.project_members || []).filter((member: any) => member.status === "removed");

  return <>
    <section className="control-page-hero users"><span className="control-eyebrow">ACCOUNT AND ACCESS</span><h1>{user.stage_name || user.full_name || "Creator"}</h1><p>{user.email} / {(user.creator_types || []).join(" / ") || "Creator"}</p></section>
    <section className="control-metrics"><article><span>Projects</span><strong>{active.length}</strong><small>Active memberships</small></article><article><span>Removed</span><strong>{removed.length}</strong><small>Restorable access</small></article><article><span>Beats uploaded</span><strong>{uploads || 0}</strong><small>Creative activity</small></article><article><span>Claims</span><strong>{claims || 0}</strong><small>Development slots</small></article><article><span>Tasks done</span><strong>{tasks || 0}</strong><small>Recorded completions</small></article><article><span>Status</span><strong className="control-date-value">{user.account_status || "active"}</strong><small>{user.global_role || "creator"}</small></article></section>
    <section className="control-grid">
      <article className="control-panel"><header><div><span className="control-eyebrow">CURRENT ACCESS</span><h2>Active projects</h2></div></header>{active.map((member: any) => <form action={removeManagedMember} className="control-row" key={member.id}><input type="hidden" name="member_id" value={member.id} /><div><strong>{first(member.projects)?.name}</strong><small>{(member.member_roles || []).map((item: any) => first(item.roles)?.name).filter(Boolean).join(", ")}</small></div><button className="control-danger">Remove access</button></form>)}{!active.length && <p className="control-empty">No active project access.</p>}</article>
      <article className="control-panel"><header><div><span className="control-eyebrow">RESTORE</span><h2>Removed memberships</h2></div></header>{removed.map((member: any) => <form action={restoreManagedMember} className="control-row" key={member.id}><input type="hidden" name="member_id" value={member.id} /><div><strong>{first(member.projects)?.name}</strong><small>Previous roles remain attached</small></div><button className="control-restore">Restore access</button></form>)}{!removed.length && <p className="control-empty">Nothing has been removed.</p>}</article>
      <article className="control-panel"><header><div><span className="control-eyebrow">ADD ACCESS</span><h2>Place in a project</h2></div></header><form action={addUsersToManagedProject} className="control-profile-add"><input type="hidden" name="user_ids" value={user.id} /><select name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select name="role_name" required defaultValue="Artist">{roles.map((role: any) => <option key={role.name}>{role.name}</option>)}</select><button>Add to project</button></form></article>
    </section>
    <section className="control-panel control-activity"><header><div><span className="control-eyebrow">RECENT ACTIVITY</span><h2>Meaningful user events</h2></div></header><div className="control-event-feed">{!events.length && <p className="control-empty">No app events recorded yet.</p>}{events.map((event: any) => <article key={event.id}><span className="control-activity-dot" /><div><strong>{event.event_name.replaceAll("_", " ")}</strong><p>{event.category}{first(event.projects)?.name ? ` / ${first(event.projects).name}` : ""}</p></div><time>{new Date(event.created_at).toLocaleString("en-KE")}</time></article>)}</div></section>
  </>;
}
