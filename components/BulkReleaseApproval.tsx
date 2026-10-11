"use client";
import {useActionState} from "react";
import {bulkApprovePending} from "../app/admin/(control)/releases/actions";
export default function BulkReleaseApproval({count}:{count:number}){
 const[state,action,pending]=useActionState(bulkApprovePending,{message:"",ok:false});
 return <form action={action} className="bulk-approval">
  <div><strong>Bulk approval</strong><p>{count} releases currently awaiting review. This operation approves up to 100 eligible pending submissions, oldest first, after you confirm. Scheduled releases remain hidden until their dates.</p></div>
  <button type="submit" name="confirmation" value="approve" disabled={pending||count===0}
   onClick={event=>{if(!window.confirm("Publish up to 100 reviewed pending songs? Confirm rights, credits, covers and audio first."))event.preventDefault();}}>
    {pending?"Approving…":"Approve up to 100 pending"}
  </button>
  {state.message&&<p role="status" className={state.ok?"bulk-info":"bulk-error"}>{state.message}</p>}
 </form>;
}
