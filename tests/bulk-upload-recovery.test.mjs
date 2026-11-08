import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const compiled=ts.transpileModule(read("lib/bulkUploadRecovery.ts"),{compilerOptions:{
 module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const {
 fingerprintBulkFile,readBulkUploadRecovery,saveBulkUploadRecovery,
 removeBulkUploadRecovery,findBulkUploadRecovery
}=await import("data:text/javascript;base64,"+Buffer.from(compiled).toString("base64"));

test("bulk audio recovery saves only metadata and never stores file contents",()=>{
 const memory=new Map();
 globalThis.window={localStorage:{
  getItem:key=>memory.get(key)||null,
  setItem:(key,value)=>memory.set(key,value)
 }};
 const item={draftId:"9f5f25a5-11cf-4cc9-acc6-48549b64c750",
  fileName:"OPTIONALS.mp3",fileSize:5200000,fileModified:1731021000000,
  fingerprint:"a".repeat(64),title:"OPTIONALS",artist:"Fackts Music",number:7,
  collection:"Dirty Economy",defaultArtist:"Fackts Music",credits:"",
  genre:"",releaseDate:"",coverExpected:true,coverName:"dirty.png",coverSize:98765,
  audioDone:false,coverDone:false,updatedAt:Date.now()};
 saveBulkUploadRecovery(item);
 assert.equal(readBulkUploadRecovery().length,1);
 assert.ok(!JSON.stringify([...memory.values()]).includes("data:audio"));
 const recovered=findBulkUploadRecovery({
  name:"OPTIONALS.mp3",size:5200000,lastModified:1731021000000
 },readBulkUploadRecovery(),new Set());
 assert.equal(recovered?.draftId,item.draftId);
 assert.equal(findBulkUploadRecovery({
  name:"OPTIONALS.mp3",size:5200001,lastModified:1731021000000
 },readBulkUploadRecovery(),new Set()),null);
 removeBulkUploadRecovery(item.draftId);
 assert.equal(readBulkUploadRecovery().length,0);
 delete globalThis.window;
});
test("fingerprinting covers the whole file and detects changes even with identical filenames and lengths",async()=>{
 const make=(text)=>Object.assign(new Blob([text],{type:"audio/mpeg"}),{
  name:"same.mp3",lastModified:1731021000000
 });
 const a=await fingerprintBulkFile(make("0".repeat(10000)+"a"+"0".repeat(10000)));
 const b=await fingerprintBulkFile(make("0".repeat(10000)+"b"+"0".repeat(10000)));
 assert.equal(a.length,64);
 assert.notEqual(a,b);
});
test("server status route checks owner and draft before exposing saved R2 chunks",()=>{
 const route=read("app/api/billboard/upload/relay/route.ts");
 assert.match(route,/export async function GET\(request:Request\)/);
 assert.match(route,/listReleaseRelayChunks\(info\.key,info\.size\)/);
 assert.match(route,/assertR2ObjectAccess\(info\.key\)/);
 assert.match(route,/assertProductionOrigin\(request\)/);
 assert.match(route,/\.eq\('artist_id',user\.id\)\.eq\('status','draft'\)/);
 assert.match(route,/release_relay_completed/);
 assert.match(route,/release_relay_failed/);
 assert.match(route,/platform_events/);
});
test("multipart upload skips already-saved chunks and safely rechecks final completion",()=>{
 const code=read("lib/releaseRelayUpload.ts");
 assert.match(code,/const saved=new Set\(/);
 assert.match(code,/if\(!saved\.has\(index\)\)/);
 assert.match(code,/if\(status\.complete\)/);
 assert.match(code,/if\(!result\?\.complete\)throw error/);
 assert.match(code,/preferResume=false/);
 assert.match(code,/await directUpload\(/);
 assert.match(code,/method:"GET"\|"PUT"\|"POST"/);
 const r2=read("lib/r2.ts");
 assert.match(r2,/listReleaseRelayChunks/);
 assert.match(r2,/ListObjectsV2Command/);
 assert.match(r2,/item\.Size===expected/);
 assert.match(r2,/RELEASE_RELAY_CHUNK_BYTES=3\*1024\*1024/);
});
test("bulk view restores original IDs, validates exact recordings and retains existing approval controls",()=>{
 const bulk=read("components/BulkReleaseImporter.tsx");
 assert.match(bulk,/findBulkUploadRecovery\(file,saved,used\)/);
 assert.match(bulk,/fingerprintBulkFile\(row\.file\)/);
 assert.match(bulk,/if\(draft\.fingerprint!==fingerprint\)/);
 assert.match(bulk,/refreshReleaseUploadResult\(draft\.id/);
 assert.match(bulk,/await finishReleaseResult\(draft\.id\)/);
 assert.match(bulk,/removeBulkUploadRecovery\(draft\.id\)/);
 assert.match(bulk,/for\(const row of queue\)/);
 assert.match(bulk,/setNotice\("Selection cleared\. Any prepared drafts remain recoverable/);
 assert.doesNotMatch(bulk,/from ['"]\.\.\/components\/TrackPlaylist/);
});
test("only upload paths are modified and all TypeScript files parse",()=>{
 for(const path of ["lib/bulkUploadRecovery.ts","lib/releaseRelayUpload.ts",
  "components/BulkReleaseImporter.tsx","lib/r2.ts","app/api/billboard/upload/relay/route.ts"]){
  const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,path+": "+ast.parseDiagnostics.map(d=>d.messageText).join(", "));
 }
});
