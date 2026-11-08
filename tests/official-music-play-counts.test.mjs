import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const transpiled=ts.transpileModule(read("lib/musicPlayTracking.ts"),{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const {musicListenThreshold,audibleProgressDelta,musicReplayBucket}=await import("data:text/javascript;base64,"+Buffer.from(transpiled).toString("base64"));

test("music-play source compiles in the isolated release",()=>{
 for(const path of ["lib/musicPlayTracking.ts","app/api/music/plays/route.ts","components/TrackPlaylist.tsx","lib/community.ts","components/MusicPlayCount.tsx","components/streaming/StreamTrackRow.tsx","components/BillboardChart.tsx","app/admin/(control)/analytics/page.tsx"]){
  const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(tree.parseDiagnostics,[],path);
 }
});
test("count audible music, not clicking or seeking",()=>{
 assert.equal(musicListenThreshold(180),30);
 assert.equal(musicListenThreshold(30),15);
 assert.equal(audibleProgressDelta(32,32,1),32);
 assert.equal(audibleProgressDelta(90,.25,1),0);
 assert.equal(audibleProgressDelta(-30,8,1),0);
});
test("ten separate qualified replays can count, short duplicate bursts cannot",()=>{
 const start=Date.parse("2026-11-08T09:00:00Z");
 const replays=Array.from({length:10},(_,i)=>musicReplayBucket(start+35000*i));
 assert.equal(new Set(replays).size,10);
 assert.equal(musicReplayBucket(start),musicReplayBucket(start+200));
});
test("the production listening player starts after metadata, qualifies through server and shows recorded counts",()=>{
 const player=read("components/TrackPlaylist.tsx");
 const server=read("app/api/music/plays/route.ts");
 assert.match(player,/onLoadedMetadata=\{\(\)=>\{[^\n]*beginPublicPlay\(\)/);
 assert.match(player,/audibleProgressDelta\(delta,elapsed,audio\.playbackRate\)/);
 assert.match(player,/fm-qualified-play/);
 assert.match(server,/assertProductionOrigin/);
 assert.match(server,/music_play_sessions/);
 assert.match(server,/\.is\("qualified_at",null\)/);
 assert.match(read("lib/community.ts"),/public_release_play_counts/);
 assert.match(read("app/admin/(control)/analytics/page.tsx"),/public_music_play_stats/);
});
