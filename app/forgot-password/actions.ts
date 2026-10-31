"use server";
import {redirect} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
import {PASSWORD_RECOVERY_REDIRECT} from "../../lib/passwordRecovery";

export async function requestReset(formData:FormData) {
  const email=String(formData.get("email")||"").trim().toLowerCase();
  if (!email || !email.includes("@") || email.length>254) {
    redirect("/forgot-password?error=Enter%20a%20valid%20email%20address.");
  }
  try {
    // Send recovery email with Supabase's implicit (browser-verifiable) flow,
    // rather than a server-side PKCE verifier tied to the requester browser.
    // This also works if the person opens their email on a different device.
    const supabase=createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {auth:{flowType:"implicit",persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
    );
    const {error}=await supabase.auth.resetPasswordForEmail(email,{
      redirectTo:PASSWORD_RECOVERY_REDIRECT
    });
    if(error){
      console.warn("FACKTS password recovery email request failed");
      redirect("/forgot-password?error=Email%20service%20is%20unavailable.%20Please%20try%20again%20later.");
    }
  }catch(error){
    if(error && typeof error==="object" && "digest" in error &&
       String((error as {digest?:string}).digest).startsWith("NEXT_REDIRECT")) throw error;
    console.warn("FACKTS password recovery service unavailable");
    redirect("/forgot-password?error=Email%20service%20is%20unavailable.%20Please%20try%20again%20later.");
  }
  redirect("/forgot-password?sent=1");
}
