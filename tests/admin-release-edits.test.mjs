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
 assert.match(ui,/directUpload\(/);
});
test("admin releases list offers metadata, cover, existing audio, and search",()=>{
 const page=source("app/admin/(control)/releases/page.tsx");
 for(const name of ["AdminReleaseDetailsEditor","AdminReleaseCoverReplacement","AdminReleaseAudioReplacement","release-q"])assert.ok(page.includes(name),name);
});
