import { notFound } from "next/navigation";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { getControlRoomPermissions, requireControlRoomPermission } from "../../../../../lib/controlRoom";
import { createManagedProjectTask, setManagedProjectLead, updateManagedProjectIdentity } from "../../projectManagementActions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;

export default async function AdminProjectOverview({params}:{params:Promise<{projectId:string}>}){
  const actor=await requireControlRoomPermission("projects");
  const perms=await getControlRoomPermissions(actor.id);
  const canTasks=perms.includes("all")||perms.includes("tasks");
  const canPeople=perms.includes("all")||perms.includes("people");
  const canReports=perms.includes("all")||perms.includes("reports");
  const {projectId}=await params; const admin=createAdminClient();
  const [{data:project},{data:events=[]},{data:roles=[]}]=await Promise.all([
    admin.from("projects").select("*,project_members(id,status,user_id,profiles(id,full_name,stage_name,email),member_roles(roles(name))),beats(id,status),tracks(id,status,development_status),studio_sessions(id,status),project_tasks(id,status,assignee_id,title,due_date)").eq("id",projectId).maybeSingle(),
    admin.from("platform_events").select("id,event_name,category,created_at,profiles(full_name,stage_name)").eq("project_id",projectId).order("created_at",{ascending:false}).limit(20),
    admin.from("roles").select("name").not("name","in","(Admin,Super Admin,Control Room Admin,Project Lead)").order("name"),
  ]);
  if(!project)notFound();
  const safeRoles = roles ?? [];
  const safeEvents = events ?? [];
  const members=(project.project_members||[]).filter((m:any)=>m.status==="active");
  const open=(project.project_tasks||[]).filter((t:any)=>t.status!=="done");

  return <>
    <section className="control-page-hero projects" style={project.hero_image_url||project.artwork_url?{backgroundImage:`linear-gradient(90deg,rgba(22,16,11,.94),rgba(22,16,11,.46)),url("${project.hero_image_url||project.artwork_url}")`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}>
      <span className="control-eyebrow">ADMIN PROJECT OVERVIEW</span><h1>{project.name}</h1><p>{project.description||"System-level project view."}</p>
      {canReports&&<a className="control-secondary-button" href={`/api/projects/${project.id}/report`} style={{display:"inline-flex",marginTop:"12px"}}>Generate & Download Project Report</a>}
    </section>

    <section className="control-metrics">
      <article><span>Members</span><strong>{members.length}</strong><small>Active access</small></article>
      <article><span>Beats</span><strong>{project.beats?.length||0}</strong><small>Library</small></article>
      <article><span>Tracks</span><strong>{project.tracks?.length||0}</strong><small>Development records</small></article>
      <article><span>Open actions</span><strong>{open.length}</strong><small>Outstanding</small></article>
      <article><span>Sessions</span><strong>{project.studio_sessions?.length||0}</strong><small>Recorded sessions</small></article>
      <article><span>Stage</span><strong style={{fontSize:"17px"}}>{project.status||"active"}</strong><small>{project.next_action||"Define next action"}</small></article>
    </section>

    <section className="control-grid">
      <article className="control-panel"><header><div><span className="control-eyebrow">PROJECT IDENTITY & APPEARANCE</span><h2>Edit the project</h2></div></header>
        <form action={updateManagedProjectIdentity} className="control-profile-add" encType="multipart/form-data">
          <input type="hidden" name="project_id" value={project.id}/>
          <label>Name<input name="name" defaultValue={project.name||""} required/></label>
          <label>Code<input name="code" defaultValue={project.code||""} required/></label>
          <label>Project type<input name="project_type" defaultValue={project.project_type||""} placeholder="EP, mixtape, album..."/></label>
          <label>Status<select name="status" defaultValue={project.status||"active"}><option>active</option><option>paused</option><option>completed</option><option>archived</option></select></label>
          <label>Description<textarea name="description" defaultValue={project.description||""}/></label>
          <label>Next action<input name="next_action" defaultValue={project.next_action||""}/></label>
          <label>Start date<input type="date" name="start_date" defaultValue={project.start_date||""}/></label>
          <label>Target release<input type="date" name="target_release_date" defaultValue={project.target_release_date||""}/></label>
          <label>Default artist slots<input type="number" name="default_beat_capacity" min="1" max="12" defaultValue={project.default_beat_capacity||3}/></label>
          <label>Cover photo<input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp"/></label>
          <label>Hero image<input type="file" name="hero_file" accept="image/jpeg,image/png,image/webp"/></label>
          <button>Save Project Update</button>
        </form>
      </article>

      {canTasks&&<article className="control-panel"><header><div><span className="control-eyebrow">OPERATIONS</span><h2>Assign a task</h2></div></header>
        <form action={createManagedProjectTask} className="control-profile-add"><input type="hidden" name="project_id" value={project.id}/><label>Task<input name="title" required/></label><label>Description<textarea name="description"/></label><label>Assignee<select name="assignee_id" defaultValue=""><option value="">Unassigned</option>{members.map((m:any)=>{const p=first(m.profiles);return <option key={m.id} value={m.user_id}>{p?.stage_name||p?.full_name||p?.email}</option>})}</select></label><label>Due date<input type="date" name="due_date"/></label><button>Create & Notify Assignee</button></form>
      </article>}
    </section>

    <section className="control-grid">
      <article className="control-panel"><header><div><span className="control-eyebrow">MEMBERS</span><h2>Project leadership</h2></div></header>
        {members.map((m:any)=>{const p=first(m.profiles);const names=(m.member_roles||[]).map((x:any)=>first(x.roles)?.name).filter(Boolean);const lead=names.includes("Project Lead");return <div className="control-row" key={m.id}><div><strong>{p?.stage_name||p?.full_name||p?.email}</strong><small>{names.join(", ")||"Member"}</small>{canPeople&&(lead?<form action={setManagedProjectLead} style={{marginTop:"7px",display:"flex",gap:"6px"}}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="mode" value="remove"/><select name="fallback_role" defaultValue="Artist">{safeRoles.map((r:any)=><option key={r.name}>{r.name}</option>)}</select><button className="control-restore">Remove Project Lead</button></form>:<form action={setManagedProjectLead} style={{marginTop:"7px"}}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="mode" value="add"/><button className="control-restore">Make Project Lead</button></form>)}</div></div>})}
      </article>
      <article className="control-panel"><header><div><span className="control-eyebrow">OUTSTANDING</span><h2>Open tasks</h2></div></header>{!open.length&&<p className="control-empty">No open tasks.</p>}{open.slice(0,12).map((t:any)=><div className="control-row" key={t.id}><div><strong>{t.title}</strong><small>{String(t.status).replaceAll("_"," ")}{t.due_date?` · ${t.due_date}`:""}</small></div></div>)}</article>
    </section>

    <section className="control-panel control-activity"><header><div><span className="control-eyebrow">PROJECT ACTIVITY</span><h2>Recent movement</h2></div></header><div className="control-event-feed">{safeEvents.map((e:any)=>{const p=first(e.profiles);return <article key={e.id}><span className="control-activity-dot"/><div><strong>{e.event_name.replaceAll("_"," ")}</strong><p>{p?.stage_name||p?.full_name||"System"} · {e.category}</p></div><time>{new Date(e.created_at).toLocaleString("en-KE")}</time></article>})}</div></section>
  </>;
}
