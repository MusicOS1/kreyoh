"use client";
import {useActionState} from "react";
import {reviewProfessionalApplication} from "../app/admin/(control)/professional-applications/actions";
import {canReview} from "../lib/professionalApplications";
export default function ProfessionalReviewForm({id,status}:{id:string;status:string}){
  const [result,action,pending]=useActionState(reviewProfessionalApplication,{error:"",success:""});
  if(!canReview(status,"approved"))return <p>No review actions available at this stage.</p>;
  return <form action={action}>
    <input type="hidden" name="application_id" value={id}/>
    <label>Decision note
      <textarea name="review_note" maxLength={1000} placeholder="Evidence reviewed or corrections required"/>
    </label>
    {canReview(status,"under_review")&&<button disabled={pending} type="submit" name="status" value="under_review" className="alt">Start review</button>}
    <button disabled={pending} type="submit" name="status" value="approved">Approve identity</button>
    <button disabled={pending} type="submit" name="status" value="changes_requested" className="alt">Request changes</button>
    <button disabled={pending} type="submit" name="status" value="rejected" className="alt">Reject</button>
    {result.error&&<p role="alert">{result.error}</p>}
    {result.success&&<p role="status">{result.success}</p>}
  </form>;
}
