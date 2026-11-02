"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createBrowserClient} from "@supabase/ssr";
import {reportRecoveryEvent} from "../../../lib/recoveryTelemetry";
import {classifyRecoveryError} from "../../../lib/recoveryTelemetry";

export default function PasswordRecoveryCallback(){
  const [status,setStatus]=useState("Checking your secure recovery link…");
  useEffect(()=>{
    let active=true;
    async function verify(){
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if(!url||!key){if(active)setStatus("Account recovery is temporarily unavailable.");return;}
      const supabase=createBrowserClient(url,key,{auth:{detectSessionInUrl:false}});
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
      const query=new URLSearchParams(window.location.search);
      const access_token=hash.get("access_token");
      const refresh_token=hash.get("refresh_token");
      const code=query.get("code");
      const token_hash=query.get("token_hash");
      const callbackError=hash.get("error")||query.get("error");
      const callbackDescription=hash.get("error_description")||query.get("error_description")||"";
      // Never leave recovery credentials in browser history after reading them.
      window.history.replaceState(null,"",window.location.pathname);
      try {
        if(callbackError){
          reportRecoveryEvent("password_recovery_failed","recovery_link",classifyRecoveryError({code:callbackError,message:callbackDescription}));
          if(active)setStatus("This recovery link was rejected or has expired. Request a fresh link.");
          return;
        }
        let error: {message:string}|null=null;
        if(access_token&&refresh_token) {
          const result=await supabase.auth.setSession({access_token,refresh_token});
          error=result.error;
        } else if(code){
          const result=await supabase.auth.exchangeCodeForSession(code);
          error=result.error;
        } else if(token_hash&&query.get("type")==="recovery"){
          const result=await supabase.auth.verifyOtp({token_hash,type:"recovery"});
          error=result.error;
        } else {
          reportRecoveryEvent("password_recovery_failed","recovery_link","link_incomplete");
          if(active)setStatus("This link is incomplete. Request a new password reset link.");
          return;
        }
        if(error){
          reportRecoveryEvent("password_recovery_failed","recovery_link",classifyRecoveryError(error));
          if(active)setStatus("This link could not be verified or was already used. Request another.");
          return;
        }
        const {data, error:userError}=await supabase.auth.getUser();
        if(userError||!data.user){
          reportRecoveryEvent("password_recovery_failed","recovery_link","session_unavailable");
          if(active)setStatus("We could not establish a secure recovery session. Request another link.");
          return;
        }
        reportRecoveryEvent("password_recovery_verified","recovery_link");
        window.location.replace("/set-password?recovery=1");
      }catch{
        reportRecoveryEvent("password_recovery_failed","recovery_link","network");
        if(active)setStatus("A connection error interrupted recovery. Request a new link if this continues.");
      }
    }
    void verify();
    return()=>{active=false;};
  },[]);
  return <main className="login-page"><section className="login-form-panel">
    <div className="login-card" role="status">
      <span className="eyebrow">FACKTS MUSIC ACCOUNT RECOVERY</span>
      <h1>Verify your reset link</h1>
      <p>{status}</p>
      <Link href="/forgot-password">Request another password reset link</Link>
      <Link href="/login">Return to sign in</Link>
    </div>
  </section></main>;
}
