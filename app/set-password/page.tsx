"use client";
import {FormEvent,useEffect,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";

export default function SetPasswordPage(){
  const [supabase]=useState(()=>{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return url&&key?createBrowserClient(url,key):null;
  });
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [message,setMessage]=useState("");
  const [ready,setReady]=useState(false);
  const [accountEmail,setAccountEmail]=useState("");
  const [checking,setChecking]=useState(true);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    let active=true;
    (async()=>{
      if(!supabase){
        if(active){setMessage("Account recovery is temporarily unavailable.");setChecking(false);}
        return;
      }
      try{
        // Verify the recovery session against Supabase, not only browser storage.
        const {data,error}=await supabase.auth.getUser();
        if(!active)return;
        if(error || !data.user) setMessage(error?"Could not verify this link. Try again or request another.":"The reset link has expired or was already used. Request a new one.");
        else {setAccountEmail(data.user.email||"");setReady(true);}
      }catch{
        if(active)setMessage("Could not verify your recovery session. Please retry.");
      }finally{if(active)setChecking(false);}
    })();
    return()=>{active=false;};
  },[supabase]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!supabase || saving || !ready)return;
    setMessage("");
    if(password.length<8){setMessage("Use a password with at least eight characters.");return;}
    if(password!==confirmPassword){setMessage("The passwords do not match.");return;}
    setSaving(true);
    try{
      const {error}=await supabase.auth.updateUser({password});
      if(error){setMessage(error.message);return;}
      // Finish recovery by asking the user to authenticate with the new password.
      // Revoke refresh sessions where supported; do not expose this account to admin.
      try{await supabase.auth.signOut({scope:"global"});}catch{}
      window.location.replace("/login?message="+encodeURIComponent("Password updated. Sign in with your new password."));
    }catch{
      setMessage("Password could not be updated. Check your connection and retry.");
    }finally{setSaving(false);}
  }

  return <main className="login-page">
    <div className="login-backdrop-atmosphere" aria-hidden="true"/>
    <section className="login-form-panel">
      <form className="login-card" onSubmit={submit}>
        <div><span className="eyebrow">SECURE ACCOUNT RECOVERY</span>
          <h2>Set your new password</h2>
          <p>Choose a new password for your FACKTS Music account.</p>
          {accountEmail&&<p>Account: <strong>{accountEmail}</strong></p>}
        </div>
        {checking&&<p role="status">Verifying your secure link…</p>}
        {message&&<div className="form-error-alert" role="alert">{message}</div>}
        {!ready&&!checking&&<a href="/forgot-password">Request another reset link →</a>}
        {ready&&<>
          <label>New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least eight characters"/></label>
          <label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your new password"/></label>
          <button className="login-submit-btn" type="submit" disabled={saving}>{saving?"Saving your password…":"Save password and sign in →"}</button>
        </>}
      </form>
    </section>
  </main>;
}
