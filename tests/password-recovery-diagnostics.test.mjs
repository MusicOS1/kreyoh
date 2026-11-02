import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("anonymous password recovery and bounded telemetry are public routes",()=>{
 const proxy=read("lib/supabase/proxy.ts");
 assert.match(proxy,/PUBLIC_ROUTES\s*=\s*\[[\s\S]*?"\/auth\/recovery"/);
 assert.match(proxy,/PUBLIC_ROUTES\s*=\s*\[[\s\S]*?"\/api\/auth\/recovery-telemetry"/);
 assert.match(proxy,/if \(isPublicRoute\(pathname\) && pathname !== "\/login"/);
});

test("recovery links verify tokens and cannot fall back to a different signed-in account",()=>{
 const recovery=read("app/auth/recovery/page.tsx");
 assert.match(recovery,/auth\.setSession\(\{access_token,refresh_token\}\)/);
 assert.match(recovery,/auth\.exchangeCodeForSession\(code\)/);
 assert.match(recovery,/auth\.verifyOtp\(\{token_hash,type:"recovery"\}\)/);
 assert.match(recovery,/callbackError/);
 assert.match(recovery,/password_recovery_failed/);
 assert.match(recovery,/password_recovery_verified/);
 assert.doesNotMatch(recovery,/global auth provider may already have consumed/);
 assert.match(recovery,/window\.history\.replaceState/);
 assert.match(recovery,/window\.location\.replace\("\/set-password\?recovery=1"\)/);
 const set=read("app/set-password/page.tsx");
 assert.match(set,/getUser\(\)/);
 assert.match(set,/updateUser\(\{password\}\)/);
 assert.match(set,/password_change_completed/);
 assert.match(set,/password_change_failed/);
});

test("reset requests log classified failures without saving credentials or revealing whether email exists",()=>{
 for(const path of ["app/forgot-password/actions.ts","app/admin/(control)/users/passwordResetActions.ts"]){
  const action=read(path);
  assert.match(action,/PASSWORD_RECOVERY_REDIRECT/);
  assert.match(action,/password_reset_request_failed/);
  assert.match(action,/password_reset_requested/);
  assert.match(action,/resetPasswordForEmail/);
  assert.doesNotMatch(action,/updateUserById.*password/);
 }
 const diagnostics=read("lib/diagnostics.ts");
 assert.match(diagnostics,/category: "authentication"/);
 assert.match(diagnostics,/classifyRecoveryFailure/);
 assert.doesNotMatch(diagnostics,/metadata:.*email|metadata:.*password/i);
});

test("public recovery telemetry is categorized, bounded, marked client-reported and never accepts raw errors",()=>{
 const route=read("app/api/auth/recovery-telemetry/route.ts");
 const client=read("lib/recoveryTelemetry.ts");
 assert.match(route,/origin!==new URL\(request.url\).origin/);
 assert.match(route,/content-length/);
 assert.match(route,/count:"exact",head:true/);
 assert.match(route,/source:"client_reported_recovery"/);
 assert.match(route,/const events=new Set/);
 assert.match(route,/const reasons=new Set/);
 assert.match(route,/category:"authentication"/);
 assert.doesNotMatch(route,/data\.email|data\.password|data\.token|data\.error|data\.message/);
 assert.doesNotMatch(client,/access_token|refresh_token|token_hash|email:/);
});

test("Admin Analytics surfaces recorded failed logins and reset failures, not only new users",()=>{
 const analytics=read("app/admin/(control)/analytics/page.tsx");
 const incident=read("app/admin/(control)/diagnostics/page.tsx");
 assert.match(analytics,/Failed logins/);
 assert.match(analytics,/Login attempts/);
 assert.match(analytics,/Reset requests/);
 assert.match(analytics,/Recovery link failures/);
 assert.match(analytics,/Password changes/);
 assert.match(analytics,/loginCauses/);
 assert.match(analytics,/authError\|\|historyError/);
 assert.match(incident,/Reset emails requested/);
 assert.match(incident,/Recovery link failures/);
 assert.match(incident,/password_change_failed/);
});
