import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("signup requires a unique public name for both Fan and Creative, without restricting legal full names",()=>{
 const ui=source("components/SignupForm.tsx");
 const action=source("app/signup/actions.ts");
 const validator=source("lib/publicName.ts");
 assert.match(ui,/name="public_name"/);
 assert.match(ui,/Creative \/ stage name/);
 assert.match(ui,/Public display name/);
 assert.match(ui,/\/api\/signup\/name-availability/);
 assert.match(ui,/disabled=\{!canSubmit\}/);
 assert.match(ui,/This name is already registered/);
 assert.match(ui,/AbortController/);
 assert.match(action,/fackts_public_name_available/);
 assert.match(action,/validatePublicName/);
 assert.match(action,/public_name:publicName/);
 assert.match(action,/stage_name:publicName/);
 assert.match(action,/nickname:publicName/);
 assert.match(action,/profileError.code==="23505"/);
 assert.doesNotMatch(action,/admin\.auth\.admin\.deleteUser/);
 assert.match(validator,/cleanPublicName/);
 assert.match(validator,/validatePublicName/);
});

test("availability uses server-side service client, never returns an account profile, and disables cache",()=>{
 const endpoint=source("app/api/signup/name-availability/route.ts");
 assert.match(endpoint,/createAdminClient/);
 assert.match(endpoint,/\.rpc\("fackts_public_name_available"/);
 assert.match(endpoint,/Cache-Control":"no-store"/);
 assert.match(endpoint,/available:data===true/);
 assert.doesNotMatch(endpoint,/\.select\("email"/);
 assert.doesNotMatch(endpoint,/return.*profile/);
});

test("database guarantees atomic case-insensitive names and preserves duplicate legacy accounts",()=>{
 const sql=source("supabase/migrations/20261103_unique_public_names.sql");
 assert.match(sql,/add column if not exists public_name/);
 assert.match(sql,/create unique index if not exists profiles_unique_public_name_claim/);
 assert.match(sql,/fackts_normalize_public_name/);
 assert.match(sql,/lower\(regexp_replace/);
 assert.match(sql,/public\.fackts_public_name_available/);
 assert.match(sql,/public\.profiles p/);
 assert.match(sql,/p\.stage_name/);
 assert.match(sql,/p\.nickname/);
 assert.match(sql,/p\.full_name/);
 assert.match(sql,/before insert or update of public_name, stage_name, nickname, full_name/);
 assert.match(sql,/errcode='23505'/);
 assert.match(sql,/revoke all on function/);
 assert.match(sql,/grant execute on function .* to service_role/);
 assert.doesNotMatch(sql,/update public\.profiles set/);
 assert.doesNotMatch(sql,/delete from public\.profiles/);
});
test("later profile changes cannot silently reuse a protected public name",()=>{
 const fan=source("app/fan/profile/actions.ts");
 const settings=source("app/settings/actions.ts");
 const managed=source("app/admin/(control)/actions.ts");
 assert.match(fan,/error\?\.code==="23505"/);
 assert.match(settings,/error\.code==="23505"/);
 assert.match(managed,/error\?\.code==="23505"/);
});
