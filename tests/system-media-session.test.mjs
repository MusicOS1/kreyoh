import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const source=readFileSync(new URL("../lib/systemMediaSession.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
new Function("exports",compiled)(exports);
const {registerSystemMediaActions,updateSystemMediaTrack,updateSystemPlaybackState,updateSystemPlaybackPosition}=exports;

test("public listener maps Android notification, lock screen and headset controls to the real queue",()=>{
 const beforeNavigator=globalThis.navigator,beforeMetadata=globalThis.MediaMetadata,beforeLocation=globalThis.location;
 const handlers=new Map(),positions=[];
 const media={metadata:null,playbackState:"none",setActionHandler:(action,handler)=>handlers.set(action,handler),setPositionState:p=>positions.push(p)};
 Object.defineProperty(globalThis,"navigator",{configurable:true,value:{mediaSession:media}});
 globalThis.MediaMetadata=class {constructor(data){Object.assign(this,data);}};
 globalThis.location={origin:"https://music.facktsafrica.co.ke"};
 const calls=[];
 try{
  const unregister=registerSystemMediaActions({
   play:()=>calls.push("play"),pause:()=>calls.push("pause"),
   previous:()=>calls.push("previous"),next:()=>calls.push("next"),
   stop:()=>calls.push("stop"),
   seek:time=>calls.push(["seek",time]),seekBy:time=>calls.push(["skip",time]),
  });
  handlers.get("play")();handlers.get("nexttrack")();handlers.get("previoustrack")();handlers.get("pause")();
  handlers.get("seekto")({seekTime:42});handlers.get("seekbackward")({seekOffset:15});
  handlers.get("seekforward")({});handlers.get("stop")();
  assert.deepEqual(calls,["play","next","previous","pause",["seek",42],["skip",-15],["skip",10],"stop"]);
  updateSystemMediaTrack({title:"Test song",artist:"Test artist",artwork:"/api/releases/fixture/cover"});
  assert.equal(media.metadata.title,"Test song");
  assert.equal(media.metadata.artist,"Test artist");
  assert.equal(media.metadata.artwork[0].src,"https://music.facktsafrica.co.ke/api/releases/fixture/cover");
  updateSystemPlaybackState(true);assert.equal(media.playbackState,"playing");
  updateSystemPlaybackPosition({duration:180,currentTime:45,playbackRate:1});
  assert.deepEqual(positions[0],{duration:180,position:45,playbackRate:1});
  unregister();assert.equal(media.playbackState,"none");assert.equal(media.metadata,null);
  assert.equal(handlers.get("nexttrack"),null);
 }finally{
  if(beforeNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,"navigator",{configurable:true,value:beforeNavigator});
  if(beforeMetadata===undefined)delete globalThis.MediaMetadata;else globalThis.MediaMetadata=beforeMetadata;
  if(beforeLocation===undefined)delete globalThis.location;else globalThis.location=beforeLocation;
 }
});
test("system controls are restricted to the persistent public player and do not alter other players",()=>{
 const player=readFileSync(new URL("../components/TrackPlaylist.tsx",import.meta.url),"utf8");
 const provider=readFileSync(new URL("../components/ListeningProvider.tsx",import.meta.url),"utf8");
 assert.deepEqual(ts.createSourceFile("player.tsx",player,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).parseDiagnostics,[]);
 assert.match(provider,/systemMediaControls/);
 assert.match(player,/if\(!systemMediaControls\)return/);
 assert.match(player,/updateSystemMediaTrack/);
 assert.match(player,/updateSystemPlaybackPosition/);
 assert.match(player,/next:\(\)=>nextTrack\(\)/);
});
