import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("administrator route is separate from People & Access",()=>{
 const nav=read("components/ControlRoomShell.tsx");
 const page=read("app/admin/(control)/administrators/page.tsx");
 const people=read("app/admin/(control)/users/page.tsx");
 assert.match(nav,/href: "\/admin\/administrators"/);
 assert.doesNotMatch(nav,/href: "\/admin\/users#admin-access"/);
 assert.match(page,/requireControlRoomPermission\("people"\)/);
 assert.match(page,/isSuperAdmin\(actor.id\)/);
 assert.match(page,/AdminRevokeAccessForm/);
 assert.match(page,/AdminGrantAccessForm/);
 assert.doesNotMatch(people,/id="admin-access"/);
 assert.doesNotMatch(people,/setScopedAdminAccess/);
});
test("creator shortcut opens their administrator record",()=>{
 const detail=read("app/admin/(control)/users/[userId]/page.tsx");
 assert.match(detail,/\/admin\/administrators\?admin_user=/);
});
test("new admin page has search and real user records",()=>{
 const code=read("app/admin/(control)/administrators/page.tsx");
 assert.match(code,/from\("profiles"\)/);
 assert.match(code,/from\("control_room_admins"\)/);
 assert.match(code,/role="status"/);
});
