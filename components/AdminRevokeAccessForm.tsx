"use client";
import {useActionState,useState} from "react";
import {revokeScopedAdminAccess} from "../app/admin/(control)/projectManagementActions";

export default function AdminRevokeAccessForm({userId,name}:{userId:string;name:string}) {
  const [confirm,setConfirm]=useState(false);
  const [state,action,pending]=useActionState(revokeScopedAdminAccess,{error:"",success:""});
  return <div className="control-revoke-admin">
    {!confirm && !state.success && <button type="button" className="control-danger"
      onClick={()=>setConfirm(true)}>Disable Admin</button>}
    {confirm && !state.success && <form action={action}>
      <input type="hidden" name="user_id" value={userId}/>
      <input type="hidden" name="active" value="false"/>
      <p><strong>Disable administrator access for {name}?</strong>
        <small>The person's music account, projects, credits and files will remain.</small></p>
      <button className="control-danger" type="submit" disabled={pending}>
        {pending?"Disabling…":"Confirm disable"}
      </button>
      <button type="button" disabled={pending} onClick={()=>setConfirm(false)}>Cancel</button>
    </form>}
    {state.error && <p role="alert" className="control-admin-action-error">{state.error}</p>}
    {state.success && <p role="status" className="control-admin-action-success">{state.success}</p>}
  </div>;
}
