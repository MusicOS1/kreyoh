"use server";

import {classifyAuthFailure,recordAuthDiagnostic} from "../../lib/diagnostics";
import {safeNext} from "../../lib/navigation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { isControlRoomUser } from "../../lib/controlRoom";
import { createAdminClient } from "../../lib/supabase/admin";

export async function controlRoomLogin(formData: FormData) {
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  const started=Date.now();
  await recordAuthDiagnostic({event:"login_attempted",surface:"control_room"});
  if(!email||!password){
    await recordAuthDiagnostic({event:"login_failed",surface:"control_room",reason:"missing_fields",durationMs:Date.now()-started});
    redirect("/admin/login?error=Enter+your+email+and+password.");
  }
  const supabase=await createClient();
  let signedUserId:string|null=null;
  let failure:unknown=null;
  try {
    const result=await supabase.auth.signInWithPassword({email,password});
    signedUserId=result.data.user?.id||null;
    failure=result.error;
  }catch(cause){failure=cause;}
  if(!signedUserId){
    await recordAuthDiagnostic({event:"login_failed",surface:"control_room",reason:classifyAuthFailure(failure),durationMs:Date.now()-started});
    redirect("/admin/login?error=Access+unavailable.");
  }
  if(!(await isControlRoomUser(signedUserId))){
    await recordAuthDiagnostic({event:"login_access_denied",surface:"control_room",reason:"access_denied",userId:signedUserId,durationMs:Date.now()-started});
    redirect("/admin/access-unavailable");
  }
  const admin=createAdminClient();
  const now=new Date().toISOString();
  await Promise.all([
    admin.from("profiles").update({last_login_at:now,last_active_at:now}).eq("id",signedUserId),
    admin.from("auth_events").insert({user_id:signedUserId,event_name:"login_completed",metadata:{surface:"control_room"}}),
  ]);
  revalidatePath("/","layout");
  const next=safeNext(String(formData.get("next")||""),"/admin");
  redirect(next.startsWith("/admin/")||next==="/admin"?next:"/admin");
}

export async function controlRoomLogout(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(user){const admin=createAdminClient();const now=new Date().toISOString();await Promise.all([
    admin.from("profiles").update({last_logout_at:now}).eq("id",user.id),
    admin.from("auth_events").insert({user_id:user.id,event_name:"logout_completed",metadata:{surface:"control_room"}}),
    admin.from("user_presence").update({status:"offline",updated_at:now}).eq("user_id",user.id),
  ]);}
  await supabase.auth.signOut();
  redirect("/admin/login");
}
