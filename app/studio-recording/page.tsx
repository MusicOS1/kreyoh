import AppShell from "../../components/AppShell";
import SessionParticipantsDropdown from "../../components/SessionParticipantsDropdown";
import "../admin/(control)/studio-sessions/studio-admin.css";
import "../../components/session-participants.css";
import {getWorkspace} from "../../lib/workspace";
import {listStudioRecorderProjects} from "../../lib/studioRecorderAccess";
import {createDelegatedStudioSession,updateDelegatedStudioSession} from "./actions";

export const dynamic="force-dynamic";
const first=(x:any)=>Array.isArray(x)?x[0]:x;
export default async function StudioRecording({searchParams}:{
 searchParams:Promise<{project_id?:string;saved?:string;updated?:string}>
}){
 const {admin,user}=await getWorkspace();
 const params=await searchParams;
 const projects=await listStudioRecorderProjects(admin,user.id);
 const selected=projects.find(p=>p.id===params.project_id)||projects[0];
 if(!selected)return <AppShell><div className="content empty-state">
  <h1>Studio Recording</h1><p>No studio recording delegation has been assigned to your account. Ask your project lead or FACKTS Music Admin to grant you recording access.</p>
 </div></AppShell>;
 const [tracksResult,membersResult,sessionsResult]=await Promise.all([
  admin.from("tracks").select("id,working_title").eq("project_id",selected.id).order("working_title").limit(300),
  admin.from("project_members").select("user_id,profiles(full_name,stage_name)").eq("project_id",selected.id).eq("status","active").limit(1000),
  admin.from("studio_sessions").select("id,starts_at,ends_at,location,notes,outcomes,status,media_source_url,media_notes,tracks(working_title)")
   .eq("project_id",selected.id).order("starts_at",{ascending:false}).limit(100)
 ]);
 const hasErrors=Boolean(tracksResult.error||membersResult.error||sessionsResult.error);
 const people=(membersResult.data||[]).map(m=>({id:m.user_id,name:first(m.profiles)?.stage_name||first(m.profiles)?.full_name||m.user_id}));
 return <AppShell><main className="content operations-page studio-history-page">
  <div className="heading"><div><span className="eyebrow">FACKTS MUSIC · DELEGATED RECORDING</span><h1>Studio Recording</h1>
   <p>Record or update sessions for projects where you have permission. You do not need project admin access.</p></div></div>
  {params.saved&&<p role="status" className="status-pill complete">Session record created.</p>}
  {params.updated&&<p role="status" className="status-pill complete">Session updated.</p>}
  <section className="panel">
   <form method="get" className="operations-form" action="/studio-recording">
    <label>Project<select name="project_id" defaultValue={selected.id}>
     {projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
    </select></label><button type="submit">Open project</button>
   </form>
  </section>
  {hasErrors?<section className="panel"><p role="alert">Session details could not be loaded. Retry; no records were changed.</p></section>:<>
   <details className="beat-intake-disclosure" open>
    <summary className="beat-intake-summary"><span>SESSION REGISTER</span><strong>Record a studio session</strong><small>Upcoming or past sessions</small><b>Open +</b></summary>
    <form action={createDelegatedStudioSession} className="panel operations-form">
     <input type="hidden" name="project_id" value={selected.id}/>
     <label>Session type<select name="is_backlog" defaultValue="false">
      <option value="false">Upcoming session</option><option value="true">Past session</option>
     </select></label>
     <label>Start time (Kenya)<input type="datetime-local" name="starts_at" required/></label>
     <label>End time (Kenya)<input type="datetime-local" name="ends_at"/></label>
     <label>Location<input name="location" maxLength={180} placeholder="Studio or room"/></label>
     <label>Track<select name="track_id" defaultValue=""><option value="">Project-wide</option>
      {(tracksResult.data||[]).map(t=><option value={t.id} key={t.id}>{t.working_title}</option>)}
     </select></label>
     <SessionParticipantsDropdown key={selected.id} options={people}/>
     <label className="full">Session notes<textarea name="notes" maxLength={4000} placeholder="What was worked on?"/></label>
     <label className="full">Outcome<textarea name="outcomes" maxLength={4000} placeholder="Results and agreed next steps"/></label>
     <label className="full">Media folder<input type="url" name="media_source_url" placeholder="https://"/></label>
     <label className="full">Media notes<textarea name="media_notes" maxLength={2000}/></label>
     <button type="submit">Save session</button>
    </form>
   </details>
   <section className="platform-home-section">
    <div className="platform-section-heading"><div><span className="eyebrow">SESSION RECORDS</span>
     <h2>{selected.name}</h2></div><span>{(sessionsResult.data||[]).length} recent sessions</span></div>
    {(sessionsResult.data||[]).map(s=><details className="session-history-card" key={s.id}>
     <summary>{first(s.tracks)?.working_title||"Project-wide session"} · {new Date(s.starts_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})} · {s.status}</summary>
     <form action={updateDelegatedStudioSession} className="operations-form">
      <input type="hidden" name="project_id" value={selected.id}/><input type="hidden" name="session_id" value={s.id}/>
      <label>Status<select name="status" defaultValue={s.status}>
       {["scheduled","in_session","follow_up_required","complete","cancelled"].map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}
      </select></label>
      <label>Notes<textarea name="notes" maxLength={4000} defaultValue={s.notes||""}/></label>
      <label>Outcome<textarea name="outcomes" maxLength={4000} defaultValue={s.outcomes||""}/></label>
      <label>Media folder<input type="url" name="media_source_url" defaultValue={s.media_source_url||""}/></label>
      <label>Media notes<textarea name="media_notes" maxLength={2000} defaultValue={s.media_notes||""}/></label>
      <button type="submit">Save update</button>
     </form>
    </details>)}
   </section>
  </>}
 </main></AppShell>;
}
