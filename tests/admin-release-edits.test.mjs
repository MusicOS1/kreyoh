import {test} from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("release correction actions and forms parse as TypeScript and TSX",()=>{
 for(const path of ["app/admin/(control)/releases/editActions.ts","app/admin/(control)/releases/coverActions.ts",
  "components/AdminReleaseDetailsEditor.tsx","components/AdminReleaseCoverReplacement.tsx","app/admin/(control)/releases/page.tsx"]){
  const text=source(path),ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics.map(d=>d.messageText),[],path);
 }
});
test("release metadata edits are admin-only, audited, and retain immutable media identifiers",()=>{
 const action=source("app/admin/(control)/releases/editActions.ts");
 assert.match(action,/requireControlRoomPermission\("music"\)/);
 assert.match(action,/release_metadata_correction_requested/);
 assert.match(action,/release_metadata_corrected/);
 assert.match(action,/\.eq\("id",id\)\.eq\("status",release\.status\)/);
 assert.match(action,/source_track_id/);
 assert.doesNotMatch(action,/update\(\{[^}]*audio_key/);
 assert.doesNotMatch(action,/update\(\{[^}]*cover_key/);
 assert.match(action,/timeZone:"Africa\/Nairobi"/);
});
test("artwork replacement keeps the same release and previous R2 object",()=>{
 const action=source("app/admin/(control)/releases/coverActions.ts"),ui=source("components/AdminReleaseCoverReplacement.tsx");
 assert.match(action,/release_cover_replacement_prepared/);
 assert.match(action,/finalizeReleaseObject\(uploadKey,finalKey\)/);
 assert.match(action,/update\(\{cover_key:finalKey\}\)/);
 assert.doesNotMatch(action,/\.delete\(/);
 assert.match(ui,/uploadAdminCoverWithFallback/);
});
test("admin releases list offers metadata, cover, existing audio, and search",()=>{
 const page=source("components/AdminReleaseRow.tsx")+source("app/admin/(control)/releases/songs/page.tsx");
 for(const name of ["AdminReleaseDetailsEditor","AdminReleaseCoverReplacement","AdminReleaseAudioReplacement","release-q"])assert.ok(page.includes(name),name);
});

test("admin release form maintains readable contrast against control-room light-theme overrides",()=>{
 const styles=source("app/admin/(control)/releases/release-editor.css");
 const community=source("app/community.css");
 assert.ok(community.includes(".control-room .community-page input"));
 assert.ok(community.includes("color:#171717"));
 assert.ok(styles.includes('.control-room .community-page .fm-release-editor :is(input:not([type="checkbox"]), select, textarea)'));
 assert.ok(styles.includes("color: #f8fafc !important"));
 assert.ok(styles.includes("-webkit-text-fill-color: #f8fafc !important"));
 assert.ok(styles.includes("background: #202020 !important"));
 assert.ok(styles.includes("color-scheme: dark"));
 assert.ok(styles.includes("select option"));
 assert.ok(styles.includes("::placeholder"));
});

test("release management supports a compact list and grid while retaining all editing actions",()=>{
 const page=source("app/admin/(control)/releases/songs/page.tsx");
 const row=source("components/AdminReleaseRow.tsx");
 const toggle=source("components/AdminReleaseViewToggle.tsx");
 const css=source("app/admin/(control)/releases/release-editor.css");
 const ast=ts.createSourceFile("AdminReleaseViewToggle.tsx",toggle,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.deepEqual(ast.parseDiagnostics.map(d=>d.messageText),[]);
 assert.ok(page.includes("AdminReleaseViewToggle"));
 assert.ok(row.includes("<details className=\"fm-release-item\""));
 assert.ok(row.includes("<summary className=\"fm-release-summary\""));
 for(const item of ["AdminReleaseDetailsEditor","AdminReleaseCoverReplacement","AdminReleaseAudioReplacement","ReleaseManagement"])assert.ok(row.includes(item),item);
 for(const item of ['useState<ViewMode>("list")',"localStorage.setItem","aria-pressed","List</button>","Grid</button>"])assert.ok(toggle.includes(item),item);
 for(const item of [".fm-release-view-grid .fm-release-items",".fm-release-summary","@media(max-width:760px)"])assert.ok(css.includes(item),item);
 assert.ok(!page.includes('<article className="community-card"'));
 assert.ok(page.includes('<BulkReleaseApproval count={pendingCount||0}/>'));
 assert.ok(page.includes('  </AdminReleaseViewToggle>\n  <nav className="bulk-pagination"'));
 assert.ok(!page.includes('BulkReleaseApprova\n'));
});
