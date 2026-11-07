import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("lib/musicPlayTracking.ts");
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const {musicListenThreshold,audibleProgressDelta,musicReplayBucket}=await import(
 "data:text/javascript;base64,"+Buffer.from(compiled).toString("base64")
);

test("30 seconds of genuine listening qualifies a normal release; shorter songs qualify proportionally",()=>{
 assert.equal(musicListenThreshold(180),30);
 assert.equal(musicListenThreshold(240),30);
 assert.equal(musicListenThreshold(45),23);
 assert.equal(musicListenThreshold(30),15);
 assert.equal(musicListenThreshold(5),5);
 assert.equal(musicListenThreshold(0),Infinity);
});
test("normal and background playback earn real seconds; seeking cannot manufacture a play",()=>{
 assert.equal(audibleProgressDelta(1,1,1),1);
 assert.equal(audibleProgressDelta(45,45,1),45); // background browser throttling
 assert.equal(audibleProgressDelta(60,30,2),60); // increased playback speed
 assert.equal(audibleProgressDelta(120,.2,1),0); // rapid seek jump
 assert.equal(audibleProgressDelta(-50,5,1),0); // rewind
 assert.equal(audibleProgressDelta(60,0,1),0); // no elapsed listening
});
test("ten separate, meaningful repeat listens can be counted, without counting instantaneous repeats",()=>{
 const start=Date.parse("2026-11-07T12:00:00Z");
 const ten=Array.from({length:10},(_,i)=>musicReplayBucket(start+i*35000));
 assert.equal(new Set(ten).size,10);
 assert.equal(musicReplayBucket(start),musicReplayBucket(start+400)); // same-second replay protection
});
test("cover-upload authorisation lookup only uses columns that exist in the connected production schema",()=>{
 const route=read("app/api/admin/releases/cover-relay/route.ts");
 assert.match(route,/select\("id,artist_id,cover_key,status"\)/);
 assert.doesNotMatch(route,/select\([^)]*source_track_id/);
 assert.match(route,/\.eq\("event_name","release_cover_replacement_prepared"\)/);
 assert.match(route,/requireControlRoomPermission\("music"\)/);
 assert.match(route,/finishReleaseRelay/);
});
test("player starts after metadata and on timeupdate, counts background time and reports server failures",()=>{
 const player=read("components/TrackPlaylist.tsx");
 const route=read("app/api/music/plays/route.ts");
 assert.match(player,/onLoadedMetadata=\{\(\)=>\{[^\n]*beginPublicPlay\(\)/);
 assert.match(player,/onTimeUpdate=\{\(\)=>\{[^\n]*beginPublicPlay\(\);capturePublicPlay\(\)/);
 assert.match(player,/audibleProgressDelta\(delta,elapsed,audio\.playbackRate\)/);
 assert.match(player,/onSeeking=\{\(\)=>/);
 assert.match(player,/setNotice\("Playback continues, but this listen could not be recorded\."\)/);
 assert.match(route,/musicListenThreshold/);
 assert.match(route,/musicReplayBucket/);
 assert.match(route,/\.is\("qualified_at",null\)/);
 assert.match(route,/music_play_sessions/);
});
