import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("production recovery URL never falls back to localhost or user-provided origins",()=>{
 const source=read("lib/passwordRecovery.ts");
 assert.match(source,/https:\/\/music\.facktsafrica\.co\.ke/);
 assert.match(source,/\/auth\/recovery/);
 assert.doesNotMatch(source,/localhost|NEXT_PUBLIC_SITE_URL/);
 for(const file of ["app/forgot-password/actions.ts","app/admin/(control)/users/passwordResetActions.ts"]){
  assert.match(read(file),/PASSWORD_RECOVERY_REDIRECT/);
 }
});
test("admin reset is permission checked, targets trusted auth email and throttles requests",()=>{
 const source=read("app/admin/(control)/users/passwordResetActions.ts");
 assert.match(source,/requireControlRoomPermission\("people"\)/);
 assert.match(source,/auth\.admin\.getUserById\(targetId\)/);
 assert.match(source,/resetPasswordForEmail\(recipient/);
 assert.match(source,/10\*60\*1000/);
 assert.match(source,/password_reset_email_requested/);
 assert.doesNotMatch(source,/updateUserById\(.*password/);
 assert.doesNotMatch(source,/generateLink/);
});
test("verified recovery callback opens password page, never homepage",()=>{
 const cb=read("app/auth/callback/route.ts");
 assert.match(cb,/isRecoveryCallback\(url\)/);
 const landing=read("app/auth/recovery/page.tsx");
 assert.match(landing,/auth\.setSession/);
 assert.match(landing,/auth\.getUser/);
 assert.match(landing,/window\.location\.replace\("\/set-password\?recovery=1"\)/);
 assert.match(cb,/\/set-password\?recovery=1/);
 assert.match(cb,/exchangeCodeForSession\(code\)/);
 assert.match(cb,/verifyOtp/);
});
test("changing password asks for confirmation and ends with fresh sign-in",()=>{
 const page=read("app/set-password/page.tsx");
 assert.match(page,/auth\.updateUser\(\{password\}\)/);
 assert.match(page,/auth\.signOut/);
 assert.match(page,/\/login\?message=/);
 assert.match(page,/confirmPassword/);
});
