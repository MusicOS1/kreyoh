import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireControlRoomPermission, isSuperAdmin } from "../../../../lib/controlRoom";
import { addUsersToManagedProject, removeManagedMember, restoreManagedMember } from "../actions";
import { setManagedProjectLead, setScopedAdminAccess } from "../projectManagementActions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;
const permissionOptions=[
["people","People & access"],["projects","All projects & project editing"],["music","Music operations"],
["tasks","Tasks & assignments"],["sessions","Studio sessions"],["documents","Documents & minutes"],
["commercial","Commercial opportunities"],["finance","Finance"],["enquiries","Enquiries"],
["intelligence","Voting & analytics"],["reports","Project reports"],["system","System settings"],
] as const;

export default async function AdminUsers({searchParams}:{searchParams:Promise<{q?:string;type?:string}>}) {
  const actor=await requireControlRoomPermission("people");
  const superAdmin=await isSuperAdmin(actor.id);
  const params=await searchParams; const admin=createAdminClient();
  let query=admin.from("profiles").select("id,full_name,stage_name,email,avatar_url,creator_types,account_status,project_members(id,status,projects(id,name),member_roles(roles(name)))").order("created_at",{ascending:false}).limit(100);
  if(params.q){const q=params.q.replace(/[,%()]/g," ");query=query.or(`full_name.ilike.%${q}%,stage_name.ilike.%${q}%,email.ilike.%${q}%`)}
  const [{data:users=[]},{data:projects=[]},{data:roles=[]},{data:controlAdmins=[]}]=await Promise.all([
    query,
    admin.from("projects").select("id,name,status").order("name"),
    admin.from("roles").select("name").not("name","in","(Admin,Super Admin,Control Room Admin)").order("name"),
    admin.from("control_room_admins").select("user_id,active,permissions").order("created_at",{ascending:false}),
  ]);
  const safeUsers = users ?? [];
  const safeProjects = projects ?? [];
  const safeRoles = roles ?? [];
  const safeControlAdmins = controlAdmins ?? [];
  const visible=safeUsers.filter((u:any)=>!params.type||(u.creator_types||[]).includes(params.type));

  return <>
    <section className="control-page-hero users"><span className="control-eyebrow">PEOPLE AND ACCESS</span><h1>The whole creative room.</h1><p>Change project leadership without deleting creative history, and keep Admin authority under Super Admin control.</p></section>

    <section className="control-panel"><header><div><span className="control-eyebrow">PROJECT ACCESS</span><h2>Add existing accounts to a project</h2></div></header>
      <form action={addUsersToManagedProject} className="control-picker">
        <select name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{safeProjects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="role_name" required defaultValue="Artist">{safeRoles.map((r:any)=><option key={r.name}>{r.name}</option>)}</select>
        <div className="control-user-checks">{visible.map((u:any)=><label key={u.id}><input type="checkbox" name="user_ids" value={u.id}/><span><strong>{u.stage_name||u.full_name||"Creator"}</strong><small>{u.email}</small></span></label>)}</div>
        <button type="submit">Add selected accounts</button>
      </form>
    </section>

    {superAdmin&&<section className="control-panel control-admin-access-panel"><header><div><span className="control-eyebrow">ADMIN GOVERNANCE</span><h2>Control what each Admin can change</h2></div></header>
      <p className="control-helper">Admins can work across projects, but only Super Admin can decide their scope.</p>
      <form action={setScopedAdminAccess} className="control-admin-permission-form">
        <select name="user_id" required defaultValue=""><option value="" disabled>Choose an existing FACKTS Music account</option>{safeUsers.map((u:any)=><option key={u.id} value={u.id}>{u.stage_name||u.full_name||u.email} · {u.email}</option>)}</select>
        <div className="control-permission-checks">{permissionOptions.map(([value,label])=><label key={value}><input type="checkbox" name="permissions" value={value}/><span>{label}</span></label>)}</div>
        <input type="hidden" name="active" value="true"/><button type="submit">Save administrator permissions</button>
      </form>
      <div className="control-admin-grants">{safeControlAdmins.map((g:any)=>{const a=(safeUsers as any[]).find(u=>u.id===g.user_id);return <article key={g.user_id}><span><strong>{a?.stage_name||a?.full_name||a?.email||"Administrator"}</strong><small>{g.active?(g.permissions||[]).join(" · "):"Access disabled"}</small></span>{g.active&&<form action={setScopedAdminAccess}><input type="hidden" name="user_id" value={g.user_id}/><input type="hidden" name="active" value="false"/><button className="control-danger">Disable Admin</button></form>}</article>})}</div>
    </section>}

    <section className="control-directory">{visible.map((u:any)=>{const active=(u.project_members||[]).filter((m:any)=>m.status==="active");const removed=(u.project_members||[]).filter((m:any)=>m.status==="removed");return <article className="control-user-card" key={u.id}>
      <div className="control-avatar">{u.avatar_url?<img src={u.avatar_url} alt=""/>:(u.stage_name||u.full_name||"U").slice(0,2).toUpperCase()}</div>
      <div><Link href={`/admin/users/${u.id}`}><h2>{u.stage_name||u.full_name||"Creator"}</h2></Link><p>{u.email}</p><span>{(u.creator_types||[]).join(" / ")||"Creator"}</span></div>
      <div className="control-memberships">
        {active.map((m:any)=>{const project=first(m.projects);const roleNames=(m.member_roles||[]).map((x:any)=>first(x.roles)?.name).filter(Boolean);const isLead=roleNames.includes("Project Lead");return <div key={m.id} style={{display:"grid",gap:"7px"}}><span><b>{project?.name}</b><small>{roleNames.join(", ")||"Project member"}</small></span>
          {isLead?<form action={setManagedProjectLead} style={{display:"flex",gap:"6px",flexWrap:"wrap"}}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="mode" value="remove"/><select name="fallback_role" defaultValue="Artist">{safeRoles.filter((r:any)=>r.name!=="Project Lead").map((r:any)=><option key={r.name}>{r.name}</option>)}</select><button className="control-restore">Remove Project Lead</button></form>:<form action={setManagedProjectLead}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="mode" value="add"/><button className="control-restore">Make Project Lead</button></form>}
          <form action={removeManagedMember}><input type="hidden" name="member_id" value={m.id}/><button className="control-danger">Remove access</button></form>
        </div>})}
        {removed.map((m:any)=>{const p=first(m.projects);return <form action={restoreManagedMember} className="removed" key={m.id}><span><b>{p?.name}</b><small>Removed</small></span><input type="hidden" name="member_id" value={m.id}/><button className="control-restore">Restore access</button></form>})}
      </div>
    </article>})}</section>
  </>;
}
