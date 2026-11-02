import Link from "next/link";
import SessionParticipantsDropdown from "../../../../components/SessionParticipantsDropdown";
import "../../../../components/session-participants.css";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createPlatformStudioSession,setPlatformStudioRecorder} from "./actions";
import "./studio-admin.css";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const first=(value:any)=>Array.isArray(value)?value[0]:value;
export default async function AdminStudioSessions({searchParams}:{
 searchParams:Promise<{q?:string;person?:string;project_id?:string;created?:string;error?:string;warning?:string;delegated?:string}>
}){
 await requireControlRoomPermission("sessions");
 const params=await searchParams;
 const admin=createAdminClient();
 const q=String(params.q||"").trim().replace(/[,%()]/g," ").slice(0,70);
 const selectedId=uuid.test(params.project_id||"")?params.project_id!:"";
 const personQuery=String(params.person||"").trim().replace(/[,%()]/g," ").slice(0,70);
 let projectQuery=admin.from("projects").select("id,code,name,status").order("name").limit(50);
 if(q)projectQuery=projectQuery.or("name.ilike.%"+q+"%,code.ilike.%"+q+"%");
 const [projectsResult,chosenResult]=await Promise.all([
  projectQuery,
  selectedId?admin.from("projects").select("id,code,name,status").eq("id",selectedId).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 const projects=projectsResult.data||[];
 const chosen=chosenResult.data;
 const [trackResult,peopleResult,sessionsResult]=chosen?await Promise.all([
  admin.from("tracks").select("id,working_title,track_code").eq("project_id",chosen.id).order("working_title").limit(250),
  admin.from("project_members").select("user_id,profiles(full_name,stage_name)").eq("project_id",chosen.id).eq("status","active").limit(1000),
  admin.from("studio_sessions").select("id,starts_at,status,location,notes,tracks(working_title)")
    .eq("project_id",chosen.id).order("starts_at",{ascending:false}).limit(15)
 ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null}];
 const memberOptions=(peopleResult.data||[]).map(row=>({
  id:row.user_id,name:first(row.profiles)?.stage_name||first(row.profiles)?.full_name||row.user_id
 }));
 const [recordersResult,matchingPeopleResult]=chosen?await Promise.all([
   admin.from("studio_session_recorders").select("user_id,active,profiles!studio_session_recorders_user_id_fkey(full_name,stage_name)")
     .eq("project_id",chosen.id).eq("active",true).limit(200),
   personQuery.length>=2
     ?admin.from("profiles").select("id,full_name,stage_name").or("full_name.ilike.%"+personQuery+"%,stage_name.ilike.%"+personQuery+"%").limit(30)
     :Promise.resolve({data:[],error:null})
 ]):[{data:[],error:null},{data:[],error:null}];
 const recorders=recordersResult.data||[];
 const matchingPeople=matchingPeopleResult.data||[];
 const selectRows=chosen&&!projects.some(p=>p.id===chosen.id)?[chosen,...projects]:projects;
 const ready=Boolean(chosen&&!trackResult.error&&!peopleResult.error&&!sessionsResult.error);
 return <main className="admin-studio-sessions">
  <div className="admin-studio-top"><span>FACKTS MUSIC · PLATFORM OPERATIONS</span>
   <h1>Studio sessions</h1>
   <p>Schedule sessions for any project from the Control Room. You do not have to join or receive an invitation to the project. The project's assigned team retains their normal access and permissions.</p>
  </div>
  {params.created&&<p role="status" className="admin-studio-notice">Session created successfully for {chosen?.name||"the selected project"}.</p>}
  {params.warning&&<p role="alert" className="admin-studio-error">Session was created. Additional action required: {params.warning}</p>}
  {params.error&&<p role="alert" className="admin-studio-error">{params.error}</p>}
  {params.delegated&&<p role="status" className="admin-studio-notice">Studio recording access {params.delegated==="granted"?"granted":"revoked"}. The person can use <Link href="/studio-recording">Studio Recording</Link> after signing in.</p>}
  <section className="admin-studio-section">
   <h2>Choose project</h2>
   <form method="get" action="/admin/studio-sessions" className="admin-studio-search">
    <label>Find a project by name or code
     <input type="search" name="q" defaultValue={q} placeholder="e.g. PROJECT 001"/>
    </label>
    <button type="submit">Find project</button>
   </form>
   <form method="get" action="/admin/studio-sessions" className="admin-studio-search">
    <input type="hidden" name="q" value={q}/>
    <label>Project
     <select name="project_id" defaultValue={chosen?.id||""} required>
      <option value="" disabled>Choose a project</option>
      {selectRows.map(project=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}
     </select>
    </label>
    <button type="submit">Open project</button>
   </form>
   {q&&!projects.length&&<p>No projects matched that search. Try a shorter name or project code.</p>}
  </section>
  {chosen&&<section className="admin-studio-section">
   <div className="admin-studio-section-heading"><div>
    <span>{chosen.code} · {chosen.status||"Project"}</span>
    <h2>Create a session for {chosen.name}</h2>
   </div><Link href="/admin/projects">Manage projects</Link></div>
   {!ready?<p role="alert">Project sessions or people could not be loaded. Refresh before creating a session.</p>:
   <form className="admin-studio-form" action={createPlatformStudioSession}>
    <input type="hidden" name="project_id" value={chosen.id}/>
    <div className="admin-studio-fields">
     <label>Session type
      <select name="is_backlog" defaultValue="false">
       <option value="false">Upcoming / live session</option>
       <option value="true">Past session / backlog</option>
      </select>
     </label>
     <label>Location / studio<input name="location" maxLength={180} placeholder="Studio name or room"/></label>
     <label>Start (Kenya time)<input type="datetime-local" name="starts_at" required/></label>
     <label>End (Kenya time)<input type="datetime-local" name="ends_at"/></label>
     <label>Project track
      <select name="track_id" defaultValue="">
       <option value="">Project-wide session</option>
       {(trackResult.data||[]).map(track=><option key={track.id} value={track.id}>{track.track_code?track.track_code+" · ":""}{track.working_title||"Untitled track"}</option>)}
      </select>
     </label>
     <label>Engineer
      <select name="engineer_id" defaultValue=""><option value="">Not assigned</option>
       {memberOptions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
     </label>
     <label>Producer
      <select name="producer_id" defaultValue=""><option value="">Not assigned</option>
       {memberOptions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
     </label>
     <SessionParticipantsDropdown key={chosen.id} options={memberOptions}/>
     <label className="admin-studio-wide">Agenda / session notes<textarea name="notes" maxLength={4000} rows={3} placeholder="What will be recorded or worked on?"/></label>
     <label className="admin-studio-wide">Outcome (for historical sessions)<textarea name="outcomes" maxLength={4000} rows={2} placeholder="Results, files or next steps"/></label>
     <label className="admin-studio-wide">Media folder URL (optional)<input type="url" name="media_source_url" placeholder="https://..."/></label>
     <label className="admin-studio-wide">Media notes<textarea name="media_notes" maxLength={2000} rows={2} placeholder="Photos, stems or file references"/></label>
    </div>
    <div className="admin-studio-form-footer"><p>Only active members of this project can be assigned. The administrator creating this session is recorded in the audit history, not added to the project's membership.</p>
     <button type="submit">Create session</button>
    </div>
   </form>}
  </section>}
  {chosen&&<section className="admin-studio-section">
   <h2>Delegate studio recording</h2>
   <p>Grant project-specific recording access to someone with a registered FACKTS Music account, without making them a project admin or adding them as a project member. Their only new workspace is <Link href="/studio-recording">Studio Recording</Link>.</p>
   {recordersResult.error?<p role="alert">Studio recording delegation needs its database setup before it can be used.</p>:<>
    <form method="get" action="/admin/studio-sessions" className="admin-studio-search">
     <input type="hidden" name="project_id" value={chosen.id}/>
     <label>Search registered person
      <input type="search" name="person" defaultValue={personQuery} placeholder="e.g. Greg"/>
     </label><button type="submit">Find person</button>
    </form>
    {personQuery&&matchingPeople.length===0&&<p>No registered account matched this name. They must create a FACKTS account first; no Admin invitation is needed.</p>}
    {matchingPeople.length>0&&<form className="admin-studio-search" action={setPlatformStudioRecorder}>
     <input type="hidden" name="project_id" value={chosen.id}/><input type="hidden" name="active" value="true"/>
     <label>Grant studio recording to
      <select name="user_id" defaultValue="" required><option value="" disabled>Choose the registered user</option>
       {matchingPeople.map(person=><option key={person.id} value={person.id}>{person.stage_name||person.full_name}</option>)}
      </select>
     </label><button type="submit">Grant recording access</button>
    </form>}
    <h3>Current recorders</h3>
    {recorders.length===0?<p>No delegates for this project yet.</p>:
     <div className="admin-studio-history">{recorders.map(person=><div key={person.user_id}>
      <strong>{first(person.profiles)?.stage_name||first(person.profiles)?.full_name||"Registered account"}</strong>
      <span>Studio recording only</span>
      <form action={setPlatformStudioRecorder}>
       <input type="hidden" name="project_id" value={chosen.id}/>
       <input type="hidden" name="user_id" value={person.user_id}/>
       <input type="hidden" name="active" value="false"/>
       <button type="submit">Revoke</button>
      </form>
     </div>)}</div>}
   </>}
  </section>}
  {chosen&&ready&&<section className="admin-studio-section">
   <h2>Recent sessions — {chosen.name}</h2>
   {!(sessionsResult.data||[]).length?<p>No studio sessions have been recorded for this project.</p>:
    <div className="admin-studio-history">{(sessionsResult.data||[]).map(s=><div key={s.id}>
     <strong>{first(s.tracks)?.working_title||"Project-wide session"}</strong>
     <span>{new Date(s.starts_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})}</span>
     <span>{s.location||"No location"}</span><span>{s.status.replaceAll("_"," ")}</span>
    </div>)}</div>}
  </section>}
 </main>;
}
