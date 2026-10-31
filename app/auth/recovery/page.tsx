"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createBrowserClient} from "@supabase/ssr";

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
      // Never leave recovery credentials in browser history after reading them.
      window.history.replaceState(null,"",window.location.pathname);
      try {
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
          // The global auth provider may already have consumed a valid URL
          // fragment and persisted its session before this component mounts.
          const existing=await supabase.auth.getUser();
          if(!existing.error&&existing.data.user){
            window.location.replace("/set-password?recovery=1");
            return;
          }
          if(active)setStatus("This link is incomplete or has expired. Request a new password reset link.");
          return;
        }
        if(error){
          // If the shared browser client processed the same one-time token
          // first, use its verified session instead of showing a false expiry.
          const existing=await supabase.auth.getUser();
          if(!existing.error&&existing.data.user){
            window.location.replace("/set-password?recovery=1");
            return;
          }
          if(active)setStatus("This link could not be verified or was already used. Request another.");
          return;
        }
        const {data, error:userError}=await supabase.auth.getUser();
        if(userError||!data.user){
          if(active)setStatus("We could not establish a secure recovery session. Request another link.");
          return;
        }
        window.location.replace("/set-password?recovery=1");
      }catch{
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
