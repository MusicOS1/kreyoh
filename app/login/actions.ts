"use server";
import { safeNext } from "../../lib/navigation";
import {classifyAuthFailure,recordAuthDiagnostic} from "../../lib/diagnostics";
import {isFanProfile} from "../../lib/fanProfile";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

export async function login(formData: FormData) {
  const next = safeNext(String(formData.get("next") || ""));
  const fail = (message: string): never => redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const started = Date.now();
  await recordAuthDiagnostic({event:"login_attempted",surface:"main"});
  if (!email || !password) {
    await recordAuthDiagnostic({event:"login_failed",surface:"main",reason:"missing_fields",durationMs:Date.now()-started});
    fail("Enter your email and password.");
  }
  const supabase = await createClient();
  let signedUserId:string|null=null;
  let failure:unknown=null;
  try{
    const result=await supabase.auth.signInWithPassword({email,password});
    signedUserId=result.data.user?.id||null;
    failure=result.error;
  }catch(cause){failure=cause;}
  if(!signedUserId){
    const reason=classifyAuthFailure(failure);
    await recordAuthDiagnostic({event:"login_failed",surface:"main",reason,durationMs:Date.now()-started});
    fail(["timeout","network","service_unavailable"].includes(reason)?"Connection interrupted. Please try again.":"Sign in failed. Check your details and try again.");
  }
  try {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("profiles").update({ last_login_at: now, last_active_at: now }).eq("id", signedUserId),
    admin.from("auth_events").insert({ user_id: signedUserId, event_name: "login_completed", metadata: { surface: "main" } }),
  ]);
  } catch {
    console.warn("Login activity logging unavailable");
  }
  const admin = createAdminClient();
  const {data:profile}=await admin.from("profiles").select("creator_types").eq("id",signedUserId).maybeSingle();
  const {count:projectCount}=await admin.from("project_members").select("id",{count:"exact",head:true}).eq("user_id",signedUserId).eq("status","active");
  const destination=next==="/home"&&isFanProfile(profile)&&!projectCount?"/fan":next;
  revalidatePath("/", "layout");
  redirect(destination);
}
