import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("isolated storage upload corrections parse without syntax errors",()=>{
 for(const path of [
  "components/BulkReleaseImporter.tsx",
  "components/AdminReleaseCoverReplacement.tsx",
  "lib/adminCoverUpload.ts",
  "app/api/admin/releases/cover-relay/route.ts",
  "lib/releaseRelayUpload.ts"
 ]){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("bulk-imported audio and shared covers both fall back to secure relay",()=>{
 const importer=read("components/BulkReleaseImporter.tsx");
 const helper=read("lib/releaseRelayUpload.ts");
 for(const kind of ['"audio"','"cover"']){
  assert.ok(importer.includes('uploadReleaseFile(draft.id,'+kind),
   "Expected relay support for "+kind);
 }
 assert.doesNotMatch(importer,/\bdirectUpload\(/);
 assert.match(helper,/await directUpload\(/);
 assert.match(helper,/relayUpload\(id,kind,file,type,label,progress\)/);
 assert.match(importer,/drafts\.current\.get\(row\.id\)/);
 assert.match(importer,/refreshReleaseUploadResult\(draft\.id/);
 assert.match(importer,/finishReleaseResult\(draft\.id\)/);
});
test("admin cover replacement remains authorized and original cover protected",()=>{
 const route=read("app/api/admin/releases/cover-relay/route.ts");
 const upload=read("lib/adminCoverUpload.ts");
 const editor=read("components/AdminReleaseCoverReplacement.tsx");
 assert.match(route,/requireControlRoomPermission\("music"\)/);
 assert.match(route,/assertProductionOrigin\(request\)/);
 assert.match(route,/\.eq\("event_name","release_cover_replacement_prepared"\)/);
 assert.match(route,/\.select\("id,artist_id,cover_key,status"\)/);
 assert.doesNotMatch(route,/\.select\("id,artist_id,cover_key,status,source_track_id"\)/);
 assert.match(route,/uploadKey/);
 assert.match(route,/finishReleaseRelay/);
 assert.doesNotMatch(route,/\.from\("music_releases"\)\.update/);
 assert.match(upload,/await directUpload\(/);
 assert.match(upload,/onFallback\(\)/);
 assert.match(editor,/uploadAdminCoverWithFallback/);
 assert.match(editor,/finishAdminCoverReplacement\(releaseId,prepared\.value\.attemptId\)/);
});
test("upload relays use small chunks and verify the assembled R2 object",()=>{
 const relay=read("lib/r2.ts");
 const client=read("lib/releaseRelayUpload.ts");
 const cover=read("lib/adminCoverUpload.ts");
 assert.match(relay,/RELEASE_RELAY_CHUNK_BYTES=3\*1024\*1024/);
 assert.match(relay,/head\.ContentLength!==size\|\|head\.ContentType!==contentType/);
 assert.match(client,/const RELAY_CHUNK_BYTES=3\*1024\*1024/);
 assert.match(cover,/const BYTES=3\*1024\*1024/);
 assert.match(cover,/await request\(url\("complete"\),"POST"/);
});
