"use server";
import {redirect} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
import {PASSWORD_RECOVERY_REDIRECT} from "../../lib/passwordRecovery";
import {recordAuthDiagnostic,classifyAuthFailure} from "../../lib/diagnostics";

export async function requestReset(formData:FormData) {
  const email=String(formData.get("email")||"").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length>254) {
    redirect("/forgot-password?error=Enter%20a%20valid%20email%20address.");
  }
  let failure:unknown=null;
  try {
    // Implicit recovery links can be opened on a different browser/device,
    // unlike PKCE verifier cookies tied to the requester's browser.
    const supabase=createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {auth:{flowType:"implicit",persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
    );
    const result=await supabase.auth.resetPasswordForEmail(email,{
      redirectTo:PASSWORD_RECOVERY_REDIRECT
    });
    failure=result.error;
  }catch(error){failure=error;}
  if(failure){
    await recordAuthDiagnostic({event:"password_reset_request_failed",
      surface:"forgot_password",reason:classifyAuthFailure(failure)});
    redirect("/forgot-password?error=Email%20service%20is%20unavailable.%20Please%20try%20again%20later.");
  }
  // Supabase deliberately does not reveal whether this email is registered.
  await recordAuthDiagnostic({event:"password_reset_requested",surface:"forgot_password"});
  redirect("/forgot-password?sent=1");
}
