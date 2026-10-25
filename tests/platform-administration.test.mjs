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
 const start=actions.indexOf("async function changeScopedAdminAccess");
 const end=actions.indexOf("export async function setManagedProjectLead",start);
 const scope=actions.slice(start,end);
 assert.match(scope,/requireSuperAdmin\(\)/);
 assert.match(scope,/control_room_admins/);
 assert.doesNotMatch(scope,/project_members/);
 assert.doesNotMatch(scope,/all.*ADMIN_PERMISSIONS/);
});
test("admin grants are above project membership tools in the UI",()=>{
 const view=file("app/admin/(control)/administrators/page.tsx");
 assert.match(view,/Appoint administrators, manage their permissions/);
 assert.match(view,/music project/);
});

test("full global admins can revoke another full global admin without project involvement",()=>{
 const actions=file("app/admin/(control)/projectManagementActions.ts");
 assert.match(actions,/if \(userId === actor.id\)/);
 assert.match(actions,/isProjectSuperAdmin\(userId\)/);
 assert.match(actions,/count < 2/);
 assert.doesNotMatch(actions,/if \(await isSuperAdmin\(userId\)\)/);
 assert.match(actions,/event_name:active \? "control_room_access_updated" : "control_room_access_revoked"/);
 assert.match(actions,/changeScopedAdminAccess\(fd,actor,"revoke"\)/);
});
test("revocation does not delete a music account and handles errors inline",()=>{
 const form=file("components/AdminRevokeAccessForm.tsx");
 const actions=file("app/admin/(control)/projectManagementActions.ts");
 const list=file("app/admin/(control)/administrators/page.tsx");
 assert.match(form,/useActionState\(revokeScopedAdminAccess/);
 assert.match(form,/Confirm disable/);
 assert.match(form,/role="alert"/);
 assert.match(list,/grant.user_id===actor.id/);
 assert.match(list,/<AdminRevokeAccessForm/);
 const fn=actions.slice(actions.indexOf("async function changeScopedAdminAccess"),actions.indexOf("export async function setManagedProjectLead"));
 assert.doesNotMatch(fn,/\bdelete\(/);
 assert.doesNotMatch(fn,/from\("project_members"\)/);
 assert.doesNotMatch(fn,/auth\.admin\.deleteUser/);
});
