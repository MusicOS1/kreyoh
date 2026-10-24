import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("People & Access always explains administrator appointment eligibility",()=>{
 const source=read("app/admin/(control)/users/page.tsx");
 assert.match(source,/<section id="admin-access" className="control-panel control-admin-access-panel">/);
 assert.match(source,/\{superAdmin \? <form action=\{setScopedAdminAccess\}/);
 assert.match(source,/role="status"/);
 assert.match(source,/does not have full platform administrator authority/);
});
test("person profile links directly to administration with selected account",()=>{
 const source=read("app/admin/(control)/users/[userId]/page.tsx");
 const users=read("app/admin/(control)/users/page.tsx");
 assert.match(source,/admin_user="\+encodeURIComponent\(user.id\)\+"#admin-access"/);
 assert.match(users,/selectedUserId/);
 assert.match(users,/defaultValue=\{selectedUser\?\.id\|\|""\}/);
});
test("Control Room exposes Platform administrators navigation",()=>{
 const source=read("components/ControlRoomShell.tsx");
 assert.match(source,/label: "Platform administrators", href: "\/admin\/users#admin-access"/);
});
