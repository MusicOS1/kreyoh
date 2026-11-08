"use client";
import {useActionState} from "react";
import {useRouter} from "next/navigation";
import {reviewAdminDraft,type AdminDraftReviewState} from "../app/admin/(control)/releases/draftActions";

export default function AdminDraftReview({id,status}:{id:string;status:"draft"|"pending"|"rejected"}){
 const router=useRouter();
 const [result,action,pending]=useActionState(async(previous:AdminDraftReviewState,form:FormData)=>{
  const next=await reviewAdminDraft(previous,form);
  if(next.ok)router.refresh();
  return next;
 },{ok:false,message:""} as AdminDraftReviewState);
 return <form action={action} className="fm-release-draft-review">
  <h3>{status==="rejected"?"Rejected release":"Release approval & moderation"}</h3>
  <p>{status!=="rejected"
   ?"Verify audio and rights before approving. Incomplete uploads cannot be published."
   :"This rejected release is retained for audit until you discard it."}</p>
  <input name="id" type="hidden" value={id}/>
  <label>Review note / reason
   <textarea name="note" minLength={10} maxLength={1000} rows={2}
    placeholder="Required for rejection or deletion. Optional for approval."/>
  </label>
  <div className="fm-release-draft-actions">
   {status!=="rejected"&&<>
    <button type="submit" name="operation" value="approve" disabled={pending}
     onClick={e=>{if(!confirm("Verify this draft's uploaded audio, cover and rights and approve it for public release?"))e.preventDefault();}}>
     {pending?"Working…":"Approve release"}</button>
    <button type="submit" name="operation" value="reject" disabled={pending}
     onClick={e=>{if(!confirm("Reject this draft and record the review reason?"))e.preventDefault();}}>
     Reject release</button>
   </>}
   <button type="submit" name="operation" value="delete" disabled={pending}
    onClick={e=>{if(!confirm("Remove this draft from the active list? The record and media remain recoverable."))e.preventDefault();}}>
    Delete release
   </button>
  </div>
  {result.message&&<p role="status" className={result.ok?"fm-release-edit-ok":"fm-release-edit-error"}>{result.message}</p>}
 </form>;
}
