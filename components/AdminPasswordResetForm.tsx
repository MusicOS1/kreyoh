"use client";
import {useActionState} from "react";
import {sendManagedPasswordReset,type ResetLinkState}
  from "../app/admin/(control)/users/passwordResetActions";

const initial:ResetLinkState={ok:false,message:""};

export default function AdminPasswordResetForm({userId}:{userId:string}){
  const [state,submit,pending]=useActionState(sendManagedPasswordReset,initial);
  return <form action={submit} className="control-profile-add">
    <input type="hidden" name="user_id" value={userId}/>
    <button type="submit" disabled={pending}>
      {pending?"Requesting reset email…":"Send password-reset link"}
    </button>
    {state.message&&<p role="status" className={state.ok?"control-empty":"form-error-alert"}>{state.message}</p>}
    <small>The user receives a secure link to FACKTS Music and chooses their own password. You cannot view or set it.</small>
  </form>;
}
