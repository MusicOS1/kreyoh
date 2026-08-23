"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { isControlRoomUser } from "../../lib/controlRoom";
import { createAdminClient } from "../../lib/supabase/admin";

export async function controlRoomLogin(formData: FormData) {
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const password=String(formData.get("password")||"");
  if(!email||!password) redirect("/admin/login?error=Enter+your+email+and+password.");
  const supabase=await createClient();
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.user) redirect("/admin/login?error=Access+unavailable.");
  if(!(await isControlRoomUser(data.user.id))){await supabase.auth.signOut();redirect("/admin/login?error=Access+unavailable.");}
  const admin=createAdminClient();
  const now=new Date().toISOString();
  await Promise.all([
    admin.from("profiles").update({last_login_at:now,last_active_at:now}).eq("id",data.user.id),
    admin.from("auth_events").insert({user_id:data.user.id,event_name:"login_completed",metadata:{surface:"control_room"}}),
  ]);
  revalidatePath("/","layout");
  redirect("/admin");
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
