import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("persistent player renders an accessible real save action without replacing the audio engine",()=>{
 const player=file("components/TrackPlaylist.tsx"),provider=file("components/ListeningProvider.tsx");
 assert.deepEqual(ts.createSourceFile("TrackPlaylist.tsx",player,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics,[]);
 assert.match(player,/className="player-save-toggle"/);
 assert.match(player,/aria-pressed=\{savedIds\.includes\(selected\.id\)\}/);
 assert.match(player,/backgroundInteraction<\{ok:boolean;error\?:string\}>\("library",\{kind:"saved"/);
 assert.match(provider,/showSaveAction initialSavedIds=\{savedIds\}/);
 assert.match(player,/audio ref=\{audioRef\}/);
 assert.match(player,/onPlaybackChange\?\./);
});
test("mobile player stays at the bottom above navigation and does not open as an overlay",()=>{
 const css=file("components/PersistentPlayer.module.css"),stream=file("components/streaming/streaming.css");
 assert.match(css,/position:fixed/);
 assert.match(css,/@media \(max-width:900px\)/);
 assert.match(css,/bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/nav\[aria-label="Mobile primary navigation"\]/);
 assert.match(css,/\.dock :global\(\.track-ballot-notice\) \{/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/\.dock :global\(\.track-chart-player\)/);
 assert.match(css,/grid-template-rows:45px 7px/);
 assert.match(stream,/bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)!important/);
});
test("saved songs returned from the signed-in listener only",()=>{
 const api=file("app/api/listening/route.ts");
 assert.match(api,/const user=await viewer\(\)/);
 assert.match(api,/\.eq\("user_id",user\.id\)\.eq\("kind","saved"\)/);
 assert.match(api,/Response\.json\(\{releases,savedIds\}/);
});
