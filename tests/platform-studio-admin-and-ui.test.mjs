import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("signup paths are accessible text-led controls, not overgrown radios",()=>{
 const form=read("components/SignupForm.tsx");
 const styles=read("app/signup/signup-paths.css");
 assert.match(form,/name="account_path" type="hidden"/);
 assert.match(form,/aria-pressed=\{path==="creative"\}/);
 assert.match(form,/aria-pressed=\{path==="fan"\}/);
 assert.doesNotMatch(form,/type="radio"/);
 assert.match(styles,/#ff6a00/);
 assert.match(styles,/Gotham/);
 assert.match(styles,/DM Sans/);
 assert.doesNotMatch(styles,/\.signup-path-card input\[type=radio\]/);
});

test("admin catalogue is readable and credit verification derives from evidence rather than a checkbox",()=>{
 const form=read("app/admin/(control)/catalogue/page.tsx");
 const action=read("app/admin/(control)/catalogue/actions.ts");
 const style=read("app/admin/(control)/catalogue/catalogue.css");
 assert.doesNotMatch(form,/name="credit_verified"/);
 assert.match(form,/name="credit_evidence_reference"/);
 assert.match(action,/const creditVerified=Boolean\(creditedId&&creditedName&&creditEvidence\)/);
 assert.match(action,/creditEvidence&&!creditedId/);
 assert.match(style,/color:#27282b!important/);
 assert.match(style,/background:#fff!important/);
 assert.match(style,/Gotham/);
});

test("Control Room platform sessions are independent of project membership and scoped to real project/team",()=>{
 const action=read("app/admin/(control)/studio-sessions/actions.ts");
 const page=read("app/admin/(control)/studio-sessions/page.tsx");
 const nav=read("components/ControlRoomShell.tsx");
 assert.match(action,/requireControlRoomPermission\("sessions"\)/);
 assert.match(page,/requireControlRoomPermission\("sessions"\)/);
 assert.match(action,/requireStudioScope\(admin,projectId,null,trackId/);
 assert.match(action,/\.from\("projects"\)/);
 assert.match(action,/\.from\("studio_sessions"\)\.insert/);
 assert.match(action,/platform_admin_studio_session_created/);
 assert.match(action,/created_by:actor.id/);
 assert.match(action,/participant/);
 assert.doesNotMatch(action,/getWorkspace\(/);
 assert.doesNotMatch(action,/project_members\.insert/);
 assert.match(nav,/\/admin\/studio-sessions/);
 assert.match(page,/Project-wide session/);
 assert.match(page,/admin\/studio-sessions/);
});

test("participants use compact searchable name selection with removable tags in both sessions portals",()=>{
 const widget=read("components/SessionParticipantsDropdown.tsx");
 const css=read("components/session-participants.css");
 const admin=read("app/admin/(control)/studio-sessions/page.tsx");
 const project=read("app/studio-sessions/page.tsx");

 assert.match(widget,/aria-expanded=\{open\}/);
 assert.match(widget,/Search project participants/);
 assert.match(widget,/role="listbox"/);
 assert.match(widget,/role="option"/);
 assert.match(widget,/aria-selected=\{selectedSet.has\(member.id\)\}/);
 assert.match(widget,/onClick=\{\(\)=>toggle\(member.id\)\}/);
 assert.match(widget,/session-participants-tags/);
 assert.match(widget,/session-participants-tag-name/);
 assert.match(widget,/session-participants-remove/);
 assert.match(widget,/aria-label=\{"Remove "\+byId.get\(id\)\+" from participants"\}/);
 assert.match(widget,/onClick=\{\(\)=>remove\(id\)\}/);
 assert.match(widget,/type="hidden" name="participants" value=\{id\}/);
 assert.doesNotMatch(widget,/type="checkbox"/);
 assert.doesNotMatch(widget,/Ctrl\/Cmd/);
 assert.doesNotMatch(widget,/session-participants-done/);

 assert.match(css,/max-height:240px/);
 assert.match(css,/session-participants-tag/);
 assert.match(css,/min-height:36px!important/);
 assert.match(css,/\.control-room \.admin-studio-sessions \.session-participants-field \.session-participants-options \.session-participants-option/);
 assert.match(admin,/<SessionParticipantsDropdown key=\{chosen.id\} options=\{memberOptions\}\/>/);
 assert.match(project,/<SessionParticipantsDropdown key=\{project.id\} options=\{memberOptions\}\/>/);
 assert.doesNotMatch(admin,/select name="participants" multiple/);
 assert.doesNotMatch(project,/select name="participants" multiple/);
});
