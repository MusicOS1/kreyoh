import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {applicationStatusLabel,missingApplicationsSchema} from "../../../../lib/professionalApplications";
import ProfessionalReviewForm from "../../../../components/ProfessionalReviewForm";
import Link from "next/link";

type EventRow={application_id:string;from_status:string|null;to_status:string;note:string|null;created_at:string};
type Row={id:string;user_id:string;profession:string;display_name:string;bio:string;
  portfolio_url:string|null;skills:string[];status:string;review_note:string|null;submitted_at:string|null};

export default async function ProfessionalApplicationsReviewPage(){
  await requireControlRoomPermission("people");
  const admin=createAdminClient();
  const [applications, counts]=await Promise.all([
    admin.from("professional_applications").select("id,user_id,profession,display_name,bio,portfolio_url,skills,status,review_note,submitted_at")
      .neq("status","draft").order("submitted_at",{ascending:false,nullsFirst:false}).limit(80),
    admin.from("professional_applications").select("id",{count:"exact",head:true})
      .in("status",["submitted","under_review"]),
  ]);
  const rows=(applications.data||[]) as Row[];
  const eventResponse=rows.length?await admin.from("professional_application_events").select("application_id,from_status,to_status,note,created_at").in("application_id",rows.map(row=>row.id)).order("created_at",{ascending:false}).limit(1000):null;
  const events=(eventResponse?.data||[]) as EventRow[];
  return <main className="control-professional-review">
    <header className="control-admin-page-header">
      <span className="control-eyebrow">CONTROL ROOM / PROFESSIONAL APPLICATIONS</span>
      <h1>Professional identity reviews</h1>
      <p>Review actual work evidence before verifying professional identities.
        Verification does not grant music-project roles or Control Room privileges.</p>
      <Link href="/admin/users">People & access →</Link>
    </header>
    <section className="control-review-overview">
      <strong>{counts.error?"—":counts.count??0}</strong><span>Applications awaiting a decision</span>
    </section>
    {applications.error?<section className="control-panel" role="alert">
      {missingApplicationsSchema(applications.error)?"Database configuration is required before reviews can begin.":"The review queue is unavailable right now."}
    </section>:
    <section className="control-review-grid" aria-label="Submitted professional applications">
      {rows.length===0?<div className="control-review-empty">
        <h2>No submitted applications</h2>
        <p>Submitted professional profiles will appear here for review.</p>
      </div>:rows.map(row=><article key={row.id} className="control-review-card">
        <span className="control-eyebrow">{row.profession} · {applicationStatusLabel(row.status)}</span>
        <h2>{row.display_name}</h2>
        <p>{row.bio}</p>
        {row.skills?.length>0&&<p><strong>Skills:</strong> {row.skills.join(" · ")}</p>}
        {row.portfolio_url&&<p><a href={row.portfolio_url} target="_blank" rel="noopener noreferrer">Open portfolio ↗</a></p>}
        {row.submitted_at&&<p><small>Submitted {new Date(row.submitted_at).toLocaleString("en-KE")}</small></p>}
        {row.review_note&&<p><strong>Previous feedback:</strong> {row.review_note}</p>}
        <ProfessionalReviewForm id={row.id} status={row.status}/>
        <h3>Review history</h3>
        {eventResponse?.error?<p role="alert">Review history could not load.</p>:
        events.filter(event=>event.application_id===row.id).slice(0,10).map((event,index)=>
          <p key={event.created_at+"-"+index} className="control-review-history">
            <strong>{applicationStatusLabel(event.to_status)}</strong>
            {" · "}{new Date(event.created_at).toLocaleString("en-KE")}
            {event.note&&<small> · {event.note}</small>}
          </p>)}
      </article>)}
    </section>}
  </main>;

}
