import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("admin regression fixes and music play analytics parse cleanly",()=>{
 const files=[
  "app/api/admin/releases/cover-relay/route.ts",
  "lib/adminCoverUpload.ts",
  "components/AdminReleaseCoverReplacement.tsx",
  "app/admin/(control)/releases/coverActions.ts",
  "app/admin/(control)/releases/draftActions.ts",
  "components/AdminDraftReview.tsx",
  "app/admin/(control)/releases/page.tsx",
  "app/api/music/plays/route.ts",
  "components/TrackPlaylist.tsx",
  "lib/community.ts",
  "app/admin/(control)/analytics/page.tsx",
  "components/BillboardChart.tsx",
  "components/streaming/StreamTrackRow.tsx",
  "app/billboard/[releaseId]/page.tsx"
 ];
 for(const file of files){
  const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,
    file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics.map(d=>d.messageText),[],file);
 }
});
test("cover replacement uses first-party fallback when CORS blocks direct R2",()=>{
 const form=read("components/AdminReleaseCoverReplacement.tsx");
 const upload=read("lib/adminCoverUpload.ts");
 const route=read("app/api/admin/releases/cover-relay/route.ts");
 assert.match(form,/uploadAdminCoverWithFallback/);
 assert.match(form,/onFallback/);
 assert.match(upload,/await directUpload/);
 assert.match(upload,/secure/i);
 assert.match(route,/requireControlRoomPermission\("music"\)/);
 assert.match(route,/platform_events/);
 assert.match(route,/release_cover_replacement_prepared/);
 assert.match(route,/assertProductionOrigin\(request\)/);
 assert.match(route,/finishReleaseRelay/);
 assert.doesNotMatch(route,/delete\(\)/);
});
test("drafts expose verified approval, rejection and recoverable deletion",()=>{
 const page=read("app/admin/(control)/releases/page.tsx");
 const actions=read("app/admin/(control)/releases/draftActions.ts");
 const form=read("components/AdminDraftReview.tsx");
 assert.match(page,/AdminDraftReview/);
 for(const value of ["approve","reject","delete"])assert.match(form,new RegExp('value="'+value+'"'));
 assert.match(actions,/assertR2ObjectAccess\(release\.audio_key\)/);
 assert.match(actions,/assertR2ObjectAccess\(release\.cover_key\)/);
 assert.match(actions,/requireControlRoomPermission\("music"\)/);
 assert.match(actions,/rights_confirmed_at/);
 assert.match(actions,/finalizeReleaseObject\(release\.audio_key,nextAudio\)/);
 assert.match(actions,/status:nextStatus/);
 assert.match(actions,/reviewed_by:actor\.id/);
 assert.match(actions,/\.eq\("status",release\.status\)/);
 assert.doesNotMatch(actions,/\.from\("music_releases"\)\.delete\(/);
});
test("real music plays qualify on server after a listening threshold and are deduplicated",()=>{
 const server=read("app/api/music/plays/route.ts");
 const player=read("components/TrackPlaylist.tsx");
 assert.match(server,/assertProductionOrigin\(request\)/);
 assert.match(server,/music_play_sessions/);
 assert.match(server,/qualified_bucket/);
 assert.match(server,/qualified_at/);
 assert.match(server,/listenedSeconds/);
 assert.match(server,/elapsed/);
 assert.match(server,/browserKey/);
 assert.match(player,/beginPublicPlay/);
 assert.match(player,/capturePublicPlay/);
 assert.match(player,/onTimeUpdate/);
 assert.match(player,/delta>0&&delta<=4/);
 assert.match(player,/!systemMediaControls\|\|enableRanking/);
});
test("recorded plays appear on listener, Billboard and music analytics without fabricated data",()=>{
 const chart=read("lib/community.ts");
 const dashboard=read("app/admin/(control)/analytics/page.tsx");
 assert.match(chart,/public_release_play_counts/);
 assert.match(chart,/counts\.error\?null/);
 assert.match(dashboard,/public_music_play_stats/);
 assert.match(dashboard,/Actual song plays/);
 assert.match(dashboard,/No zero counts have been substituted/);
 assert.match(read("components/BillboardChart.tsx"),/plays/);
 assert.match(read("components/streaming/StreamTrackRow.tsx"),/plays/);
});
