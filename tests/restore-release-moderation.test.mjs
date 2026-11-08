import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("release management and approval controls parse as valid TypeScript",()=>{
 for(const path of ["app/admin/(control)/releases/page.tsx",
  "app/admin/(control)/releases/draftActions.ts","components/AdminDraftReview.tsx"]){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("Draft and Pending releases have explicit Approve, Reject and Delete actions",()=>{
 const page=read("components/AdminReleaseRow.tsx");
 const ui=read("components/AdminDraftReview.tsx");
 assert.match(page,/import AdminDraftReview/);
 assert.match(page,/\["draft","pending","rejected"\]\.includes\(release\.status\)/);
 assert.match(page,/AdminDraftReview id=\{release\.id\}/);
 assert.match(page,/Review \/ Actions/);
 for(const label of ["Approve release","Reject release","Delete release"])
  assert.ok(ui.includes(label),"Missing "+label);
 for(const action of ['value="approve"','value="reject"','value="delete"'])
  assert.ok(ui.includes(action),"Missing submitter "+action);
});
test("published release management and cover/audio controls remain unchanged",()=>{
 const page=read("components/AdminReleaseRow.tsx")+read("app/admin/(control)/releases/songs/page.tsx");
 for(const existing of ["ReleaseManagement","AdminReleaseDetailsEditor",
  "AdminReleaseCoverReplacement","AdminReleaseAudioReplacement",
  "AdminReleaseViewToggle","BulkReleaseApproval"])
  assert.ok(page.includes(existing),existing+" was removed");
});
test("only authorized music admins can review: verify uploads and rights before publish",()=>{
 const action=read("app/admin/(control)/releases/draftActions.ts");
 assert.match(action,/requireControlRoomPermission\("music"\)/);
 assert.match(action,/rights_confirmed_at/);
 assert.match(action,/assertR2ObjectAccess\(release\.audio_key\)/);
 assert.match(action,/assertR2ObjectAccess\(release\.cover_key\)/);
 assert.match(action,/if\(release\.status==="draft"\)/);
 assert.match(action,/finalizeReleaseObject\(release\.audio_key,nextAudio\)/);
 assert.match(action,/\.eq\("audio_key",release\.audio_key\)/);
 assert.match(action,/\.eq\("cover_key",release\.cover_key\)/);
 assert.match(action,/\.eq\("status",release\.status\)/);
 assert.match(action,/release_draft_approval_requested/);
 assert.match(action,/release_draft_discarded/);
 assert.doesNotMatch(action,/\.from\("music_releases"\)\.delete/);
});
test("styles make moderation actions visible in mobile without touching fan player",()=>{
 const styles=read("app/admin/(control)/releases/release-editor.css");
 assert.match(styles,/\.fm-release-draft-review/);
 assert.match(styles,/button\[value="approve"\]/);
 assert.match(styles,/button\[value="delete"\]/);
 assert.match(styles,/@media\(max-width:760px\)/);
 assert.doesNotMatch(styles,/\.fs-hero|\.fm-streaming-ui/);
});
