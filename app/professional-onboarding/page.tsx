import Link from "next/link";
import ProfessionalApplicationForm from "../../components/ProfessionalApplicationForm";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {
  PROFESSIONS, applicationStatusLabel, canApplicantEdit, missingApplicationsSchema,
} from "../../lib/professionalApplications";


type Application = {
  id:string;profession:string;display_name:string;bio:string;
  skills:string[];portfolio_url:string|null;experience_years:number|null;
  status:string;review_note:string|null;submitted_at:string|null;
  updated_at:string;
};
type ApplicationEvent={to_status:string;from_status:string|null;created_at:string;note:string|null};

export default async function ProfessionalOnboardingPage({
  searchParams,
}: { searchParams:Promise<{profession?:string}> }) {
  const {user,admin,profile}=await getWorkspace();
  const result=await admin.from("professional_applications").select(
    "id,profession,display_name,bio,skills,portfolio_url,experience_years,status,review_note,submitted_at,updated_at",
  ).eq("user_id",user.id).order("updated_at",{ascending:false});
  const apps=(result.data||[]) as Application[];
  const requested=(await searchParams).profession||"";
  const chosen=PROFESSIONS.find(role=>role===requested) || (
    apps.length ? PROFESSIONS.find(role=>role===apps[0].profession) : undefined
  ) || "Artist";
  const current=apps.find(a=>a.profession===chosen);
  const editable=canApplicantEdit(current?.status);
  const historyResult=current?await admin.from("professional_application_events").select("to_status,from_status,created_at,note").eq("application_id",current.id).order("created_at",{ascending:false}).limit(20):null;
  const history=(historyResult?.data||[]) as ApplicationEvent[];
  const unavailable=missingApplicationsSchema(result.error);
  return <AppShell><main className="content professional-onboarding">
    <style>{".professional-onboarding{max-width:1120px;margin:auto}.professional-onboarding .application-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,1fr);gap:18px;margin-top:22px}.professional-onboarding .application-card{background:#111216;border:1px solid #343337;border-radius:16px;padding:22px}.professional-onboarding .application-card label{display:grid;gap:7px;font-size:14px;margin:16px 0}.professional-onboarding input,.professional-onboarding textarea{width:100%;min-height:44px;background:#1c1d21;color:#fff;border:1px solid #494345;border-radius:9px;padding:11px;font:inherit}.professional-onboarding textarea{min-height:120px}.professional-onboarding button,.professional-onboarding .application-chip{padding:11px 14px;border:1px solid #a27a3c;border-radius:10px;background:#d6a95b;color:#15110b;font-weight:700;cursor:pointer}.professional-onboarding button.secondary{background:transparent;color:#f3d49c}.professional-onboarding button:disabled{opacity:.55;cursor:wait}.professional-onboarding .application-actions{display:flex;gap:10px;flex-wrap:wrap}.professional-onboarding .application-feedback{padding:12px;border:1px solid #a27a3c;border-radius:10px;margin-top:14px}.professional-onboarding .application-profession-picker{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:20px 0}.professional-onboarding .application-profession-picker select{width:min(100%,280px);min-height:44px;padding:10px;background:#1c1d21;color:#fff;border:1px solid #494345;border-radius:10px}.professional-onboarding .application-history{padding-left:22px}.professional-onboarding .application-history li{margin:12px 0}.professional-onboarding .application-history small{display:block}.professional-onboarding .application-chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.professional-onboarding .application-chip{background:#242127;color:#f3d49c;text-decoration:none;font-size:13px}.professional-onboarding p,.professional-onboarding small{color:#b9b5b5}.professional-onboarding .message{padding:16px;border:1px solid #bd925a;border-radius:10px;margin-top:16px}@media(max-width:760px){.professional-onboarding .application-grid{grid-template-columns:1fr}.professional-onboarding .application-card{padding:16px}}"}</style>
    <div className="heading"><div><span className="eyebrow">FACKTS MUSIC / PROFESSIONAL IDENTITY</span>
      <h1>Build your professional identity</h1>
      <p>One account, several creative disciplines. Submitting a profile requests review; it never grants project, A&R, management or admin permissions.</p>
    </div></div>
    <p><Link href="/professional-record">My verified credits →</Link> · <Link href="/invitations">Project invitations →</Link> · <Link href="/projects">My projects →</Link></p>
    {result.error ? <div className="message" role="alert">{unavailable
      ? "Professional applications are not yet enabled in this environment. The Session 2 database migration must be installed before applications can be used."
      : "Applications are temporarily unavailable. Please try again."}</div> : <>
      <div className="application-chips" aria-label="Your professional applications">
        {apps.map(a=><Link key={a.id} className="application-chip" href={"/professional-onboarding?profession="+encodeURIComponent(a.profession)}>
          {a.profession} · {applicationStatusLabel(a.status)}
        </Link>)}
      </div>
      <form className="application-profession-picker" method="get" action="/professional-onboarding">
        <label htmlFor="profession-select">Professional discipline</label>
        <select id="profession-select" name="profession" defaultValue={chosen}>
          {PROFESSIONS.map(role=><option key={role} value={role}>{role}</option>)}
        </select>
        <button type="submit">Open profession</button>
      </form>
      <div className="application-grid">
      <section className="application-card">
        <h2>{current ? "Your " + chosen + " application" : "Start a " + chosen + " application"}</h2>
        <ProfessionalApplicationForm key={chosen} profession={chosen} current={current}
          defaults={{name:profile?.stage_name||profile?.full_name||"",bio:profile?.bio||"",skills:profile?.skills_genres||[]}}
          editable={editable}/>
      </section>
      <aside className="application-card">
        <span className="eyebrow">CURRENT STATUS</span>
        <h2>{applicationStatusLabel(current?.status||"draft")}</h2>
        {current?.submitted_at && <p>Submitted {new Date(current.submitted_at).toLocaleDateString("en-KE")}</p>}
        {current?.review_note && <div className="message"><strong>Reviewer feedback</strong><p>{current.review_note}</p></div>}
        <p>Professional identity is separate from project membership, employment claims, verified credits and privileged access.</p>
        <p>Already part of a project? Use the existing invitation and collaboration tools; applications do not automatically enroll you.</p>
        <h3>Review history</h3>
        {historyResult?.error?<p role="alert">Review history is temporarily unavailable.</p>
          :history.length?<ol className="application-history">{history.map((event,index)=>
            <li key={event.created_at+"-"+index}><strong>{applicationStatusLabel(event.to_status)}</strong>
              <small>{new Date(event.created_at).toLocaleString("en-KE")}</small>
              {event.note&&<p>{event.note}</p>}
            </li>)}</ol>:<p>No decisions recorded yet.</p>}
      </aside></div>
    </>}
  </main></AppShell>;
}
