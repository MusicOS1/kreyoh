import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("cover relay server, client fallback and admin UI parse cleanly",()=>{
 for(const path of [
  "app/api/admin/releases/cover-relay/route.ts",
  "lib/adminCoverUpload.ts",
  "components/AdminReleaseCoverReplacement.tsx"
 ]){
  const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("cover relay validates current admin, exact upload intent and existing schema",()=>{
 const route=read("app/api/admin/releases/cover-relay/route.ts");
 for(const fragment of [
  'assertProductionOrigin(request)',
  'requireControlRoomPermission("music")',
  '.eq("user_id",actor.id)',
  '.eq("event_name","release_cover_replacement_prepared")',
  '.eq("entity_id",releaseId)',
  '.select("id,artist_id,cover_key,status")',
  'release.cover_key!==oldKey',
  'release.status!==status',
  'uploadKey',
  'preparedType!==contentType||preparedSize!==size',
  'Date.now()-new Date(intent.created_at).getTime()>3600000'
 ])assert.ok(route.includes(fragment),"Missing authorisation guard: "+fragment);
 assert.doesNotMatch(route,/\.select\("id,artist_id,cover_key,status,source_track_id"\)/);
 assert.doesNotMatch(route,/\.from\("music_releases"\)\.update/);
});
test("secure upload chunks satisfy Vercel request limits and cover size limits",()=>{
 const upload=read("lib/adminCoverUpload.ts");
 const relay=read("app/api/admin/releases/cover-relay/route.ts");
 assert.match(upload,/const BYTES=3\*1024\*1024/);
 assert.match(relay,/const maxBytes=10\*1024\*1024/);
 assert.match(relay,/uploadReleaseRelayChunk/);
 assert.match(relay,/uploadReleaseRelayPart/);
 assert.match(relay,/finishReleaseRelay/);
 assert.match(relay,/startR2Multipart/);
 assert.match(relay,/status:400/);
});
test("fallback keeps old image when blocked and finalizes only after server verified upload",()=>{
 const ui=read("components/AdminReleaseCoverReplacement.tsx");
 const upload=read("lib/adminCoverUpload.ts");
 const finalize=read("app/admin/(control)/releases/coverActions.ts");
 assert.match(ui,/uploadAdminCoverWithFallback/);
 assert.match(ui,/finishAdminCoverReplacement\(releaseId,prepared.value.attemptId\)/);
 assert.match(ui,/onFallback/);
 assert.match(upload,/await directUpload/);
 assert.match(upload,/await request\(url\("complete"\),"POST"/);
 assert.match(finalize,/assertR2ObjectAccess\(uploadKey\)/);
 assert.match(finalize,/finalizeReleaseObject\(uploadKey,finalKey\)/);
 assert.match(finalize,/\.update\(\{cover_key:finalKey\}\)/);
 assert.doesNotMatch(upload,/from\("music_releases"\)/);
});
