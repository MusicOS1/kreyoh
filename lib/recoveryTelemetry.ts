"use client";

export type RecoveryEvent=
 "password_recovery_verified"|"password_recovery_failed"|
 "password_change_completed"|"password_change_failed";

export function reportRecoveryEvent(event:RecoveryEvent,stage:"recovery_link"|"set_password",reason="unknown"){
 // Best-effort, categorical telemetry only; never send the link, email,
 // password, token, stack trace or error message.
 if(typeof window==="undefined")return;
 void fetch("/api/auth/recovery-telemetry",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   credentials:"same-origin",
   keepalive:true,
   body:JSON.stringify({event,stage,reason})
 }).catch(()=>{});
}

/** Browser-safe, allowlisted classification: never persist raw error content. */
export function classifyRecoveryError(error:unknown):
 "link_expired"|"link_invalid"|"rate_limited"|"network"|"timeout"|"session_unavailable"|"password_rejected"|"unknown"{
 if(!error||typeof error!=="object")return "unknown";
 const e=error as {code?:string;message?:string;name?:string;status?:number};
 const value=(String(e.code||"")+" "+String(e.name||"")+" "+String(e.message||"")).toLowerCase();
 if(e.status===429||/rate.limit|too.many.requests/.test(value))return "rate_limited";
 if(/expired|otp_expired/.test(value))return "link_expired";
 if(/invalid|access.denied|otp_disabled|already.used/.test(value))return "link_invalid";
 if(/timeout|abort/.test(value))return "timeout";
 if(/network|fetch.failed/.test(value))return "network";
 if(/session.*missing/.test(value))return "session_unavailable";
 if(/password/.test(value))return "password_rejected";
 return "unknown";
}
