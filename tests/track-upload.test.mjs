import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(path, dependencies={}) {
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('require','exports',code)(name=>dependencies[name]||{},exports);return exports;
}
const policy=load('../lib/trackUploadPolicy.ts');
test('large stems are accepted independently of the audio limit; invalid sizes remain rejected',()=>{
 assert.equal(policy.trackUploadError('stems.zip','application/x-zip-compressed',3*1024**3),null);
 assert.equal(policy.trackUploadError('song.wav','audio/wav',250*1024**2),null);
 for(const size of [0,-1,NaN,Infinity,4*1024**3+1])assert.ok(policy.trackUploadError('stems.zip','application/zip',size));
 assert.ok(policy.trackUploadError('song.wav','audio/wav',251*1024**2));
 assert.ok(policy.trackUploadError('script.html','text/html',100));
});
test('expected errors survive production serialization without disclosing unexpected details',async()=>{
 const {uploadResult}=load('../lib/uploadResult.ts');
 const original=console.error;console.error=()=>{};
 try{
  assert.deepEqual(await uploadResult(async()=>({key:'ok'})),{ok:true,value:{key:'ok'}});
  const expected=await uploadResult(async()=>{throw Error('This ZIP exceeds 4 GB per file. Split it into smaller archives.');});
  assert.equal(expected.ok,false);assert.match(expected.error,/4 GB/);
  const internal=await uploadResult(async()=>{throw Error('database password=secret');});
  assert.equal(internal.ok,false);assert.doesNotMatch(internal.error,/secret|password/);assert.match(internal.error,/reference/);
 }finally{console.error=original;}
});
test('track registration refuses a foreign storage key before inspecting storage',async()=>{
 const actions=load('../app/tracks/actions.ts',{
  '../../lib/workspace':{getWorkspace:async()=>({project:{id:'p'},membership:{},roles:['Producer'],user:{id:'u'},admin:{from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{id:'t'}})})}}),hasAnyRole:()=>true},
  '../../lib/r2':{assertR2ObjectAccess:()=>{throw Error('must not access storage');}},
 });
 const form=new FormData();form.set('track_id','t');form.set('storage_key','foreign/tracks/t/a.zip');form.set('file_name','a.zip');
 await assert.rejects(()=>actions.saveTrackAsset(form),/does not belong/);
});
