import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { addUsersToManagedProject, removeManagedMember, restoreManagedMember } from "../actions";

const first = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id,full_name,stage_name,email,avatar_url,creator_types,account_status,created_at,last_login_at,last_logout_at,last_active_at,project_members(id,status,projects(name),member_roles(roles(name)))").order("created_at", { ascending: false }).limit(100);
  if (params.q) query = query.or(`full_name.ilike.%${params.q}%,stage_name.ilike.%${params.q}%,email.ilike.%${params.q}%`);
  const [{ data: users = [] }, { data: projects = [] }, { data: roles = [] }] = await Promise.all([
    query,
    admin.from("projects").select("id,name,status").order("name"),
    admin.from("roles").select("name").not("name", "in", "(Admin,Super Admin,Control Room Admin)").order("name"),
  ]);
  if (!users || !projects || !roles) throw new Error("Control Room user data could not be loaded.");
  const visible = (users || []).filter((user: any) => !params.type || (user.creator_types || []).includes(params.type));

  return <>
    <section className="control-page-hero users"><span className="control-eyebrow">PEOPLE AND ACCESS</span><h1>The whole creative room.</h1><p>Find people, understand their access, restore removed memberships and place existing users into the right project without recreating an account.</p></section>
    <section className="control-panel"><form className="control-filter"><input name="q" defaultValue={params.q} placeholder="Search name or email" /><input name="type" defaultValue={params.type} placeholder="Creator type" /><button>Search people</button></form></section>
    <section className="control-panel"><header><div><span className="control-eyebrow">PROJECT ACCESS</span><h2>Add existing accounts to a project</h2></div></header><p className="control-helper">Removed access can be restored below. The person keeps the same FACKTS Music account and does not need to sign up again.</p><form action={addUsersToManagedProject} className="control-picker"><select name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{projects.map((project: any) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select name="role_name" required defaultValue="Artist">{roles.map((role: any) => <option key={role.name}>{role.name}</option>)}</select><div className="control-user-checks">{visible.map((user: any) => <label key={user.id}><input type="checkbox" name="user_ids" value={user.id} /><span><strong>{user.stage_name || user.full_name || "Creator"}</strong><small>{user.email} / {(user.creator_types || []).join(", ") || "Creator"}</small></span></label>)}</div><button type="submit">Add selected accounts</button></form></section>
    <section className="control-directory">{visible.map((user: any) => {
      const active = (user.project_members || []).filter((member: any) => member.status === "active");
      const removed = (user.project_members || []).filter((member: any) => member.status === "removed");
      return <article className="control-user-card" key={user.id}>
        <div className="control-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : (user.stage_name || user.full_name || "U").slice(0, 2).toUpperCase()}</div>
        <div><Link href={`/admin/users/${user.id}`}><h2>{user.stage_name || user.full_name || "Creator"}</h2></Link><p>{user.email}</p><span>{(user.creator_types || []).join(" / ") || "Creator"}</span><small>Last login {user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-KE") : "not recorded"} / Last active {user.last_active_at ? new Date(user.last_active_at).toLocaleString("en-KE") : "not recorded"}</small></div>
        <div className="control-memberships">
          {active.map((member: any) => { const project = first(member.projects); const roleNames = (member.member_roles || []).map((item: any) => first(item.roles)?.name).filter(Boolean); return <form action={removeManagedMember} key={member.id}><span><b>{project?.name}</b><small>{roleNames.join(", ")}</small></span><input type="hidden" name="member_id" value={member.id} /><button className="control-danger">Remove access</button></form>; })}
          {removed.map((member: any) => { const project = first(member.projects); const roleNames = (member.member_roles || []).map((item: any) => first(item.roles)?.name).filter(Boolean); return <form action={restoreManagedMember} className="removed" key={member.id}><span><b>{project?.name}</b><small>Removed / {roleNames.join(", ") || "Previous role retained"}</small></span><input type="hidden" name="member_id" value={member.id} /><button className="control-restore">Restore access</button></form>; })}
          {!active.length && !removed.length && <p className="control-empty">No project membership yet.</p>}
        </div>
      </article>;
    })}</section>
  </>;
}
