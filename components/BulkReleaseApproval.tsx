"use client";
import {useActionState,useState} from "react";
import {backgroundInteraction} from "../lib/backgroundInteraction";
export default function BulkReleaseApproval({count}:{count:number}){
 const[remaining,setRemaining]=useState(count);
 const[state,action,pending]=useActionState(async(_state:{message:string;ok:boolean},form:FormData)=>{try{const result=await backgroundInteraction<{message:string;ok:boolean;approvedCount?:number}>("bulkApprove",form);if(result.ok)setRemaining(value=>Math.max(0,value-(result.approvedCount||0)));return result;}catch{return {message:"Could not approve releases. Try again.",ok:false};}},{message:"",ok:false});
 return <form action={action} className="bulk-approval">
  <div><strong>Bulk approval</strong><p>{remaining} releases currently awaiting review. This operation approves up to 100 eligible pending submissions, oldest first, after you confirm. Scheduled releases remain hidden until their dates.</p></div>
  <button type="submit" name="confirmation" value="approve" disabled={pending||remaining===0}
   onClick={event=>{if(!window.confirm("Publish up to 100 reviewed pending songs? Confirm rights, credits, covers and audio first."))event.preventDefault();}}>
    {pending?"Approving…":"Approve up to 100 pending"}
  </button>
  {state.message&&<p role="status" className={state.ok?"bulk-info":"bulk-error"}>{state.message}</p>}
 </form>;
}
