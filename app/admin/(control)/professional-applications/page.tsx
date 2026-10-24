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
  return <main className="content professional-review">
    <style>{".professional-review .review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}.professional-review .review-card{padding:20px;border:1px solid #40382c;background:#121317;border-radius:14px}.professional-review .review-card h2{font-size:20px}.professional-review .review-card p{color:#c5c0b8}.professional-review .review-card textarea{width:100%;min-height:86px;background:#202127;color:#fff;padding:12px;border:1px solid #776144;border-radius:8px}.professional-review .review-card button{padding:10px 12px;border-radius:9px;background:#d6a95b;color:#15120b;border:0;margin:5px 5px 5px 0;font-weight:700;cursor:pointer}.professional-review .review-card button.alt{background:#343439;color:#f5eee4}.professional-review .review-card button:disabled{opacity:.5;cursor:wait}.professional-review .review-card a{color:#e9bd70}"}</style>
    <div className="heading"><div><span className="eyebrow">CONTROL ROOM / PROFESSIONAL APPLICATIONS</span>
      <h1>Professional identity reviews</h1>
      <p>Check actual work evidence before verifying professional identities. Approval does not grant project roles or Control Room permissions.</p>
    </div></div>
    <p><strong>{counts.error?"—":counts.count??0}</strong> awaiting a decision · <Link href="/admin/users">People & access</Link></p>
    {applications.error?<p role="alert">{missingApplicationsSchema(applications.error)
      ?"Database setup required: apply and verify the Session 2 migration before reviewing applications."
      :"The review queue is unavailable right now."}</p>:
    <div className="review-grid">{rows.length===0?<p>No submitted applications.</p>:rows.map(row=>
      <article key={row.id} className="review-card">
        <span className="eyebrow">{row.profession} · {applicationStatusLabel(row.status)}</span>
        <h2>{row.display_name}</h2>
        <p>{row.bio}</p>
        {row.skills?.length>0&&<p><small>Skills: {row.skills.join(" · ")}</small></p>}
        {row.portfolio_url&&<p><a href={row.portfolio_url} target="_blank" rel="noopener noreferrer">Open portfolio ↗</a></p>}
        {row.submitted_at&&<p><small>Submitted {new Date(row.submitted_at).toLocaleString("en-KE")}</small></p>}
        {row.review_note&&<p><strong>Previous feedback:</strong> {row.review_note}</p>}
        <ProfessionalReviewForm id={row.id} status={row.status}/>
        <h3>Review history</h3>
        {eventResponse?.error?<p role="alert">Review history could not load.</p>
          :events.filter(event=>event.application_id===row.id).slice(0,10).map((event,index)=>
            <p key={event.created_at+"-"+index}><strong>{applicationStatusLabel(event.to_status)}</strong>
              {" · "}{new Date(event.created_at).toLocaleString("en-KE")}
              {event.note?<small> · {event.note}</small>:null}</p>)}
      </article>)}</div>}
  </main>;
}
