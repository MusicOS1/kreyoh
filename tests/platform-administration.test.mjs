import { test } from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("global full-access administrator is independent of project membership",()=>{
 const code=file("lib/controlRoom.ts");
 const fn=code.slice(code.indexOf("export async function isSuperAdmin"),code.indexOf("export async function isControlRoomUser"));
 assert.match(fn,/control_room_admins/);
 assert.match(fn,/grant\?\.active === true/);
 assert.match(fn,/grant\.permissions\.includes\("all"\)/);
 assert.match(fn,/roles\.includes\("Super Admin"\)/);
});
test("only full-access administrators grant project-independent Control Room access",()=>{
 const actions=file("app/admin/(control)/projectManagementActions.ts");
 const start=actions.indexOf("export async function setScopedAdminAccess");
 const end=actions.indexOf("export async function setManagedProjectLead",start);
 const scope=actions.slice(start,end);
 assert.match(scope,/requireSuperAdmin\(\)/);
 assert.match(scope,/control_room_admins/);
 assert.doesNotMatch(scope,/project_members/);
 assert.doesNotMatch(scope,/all.*ADMIN_PERMISSIONS/);
});
test("admin grants are above project membership tools in the UI",()=>{
 const view=file("app/admin/(control)/users/page.tsx");
 assert.ok(view.indexOf("PLATFORM ADMINISTRATION") < view.indexOf("MUSIC PROJECT ACCESS"));
 assert.match(view,/No project invitation or project membership is required/);
});
