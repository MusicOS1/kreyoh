import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../app/api/track-assets/[assetId]/download/route.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const assetId='9d5b8669-8a79-47cd-b65b-d04d07b1d57d';
async function run({member=true, asset={entity_id:'track',bucket_id:'r2',storage_path:'project/tracks/track/stems.zip',file_name:'mdagi mdagi files.zip'}, fail=false}={}) {
  const filters=[]; const signatures=[];
  const query={select(){return this},eq(...args){filters.push(args);return this},async maybeSingle(){return {data:asset,error:null}}};
  const exports={};
  new Function('require','exports',code)((name)=>name.includes('workspace') ? {getWorkspace:async()=>({project:{id:'project'},membership:member?{}:null,admin:{from:()=>query}})} : {createR2PresignedUrl:async(...args)=>{signatures.push(args);if(fail)throw Error();return 'https://storage.example/signed'}},exports);
  const response=await exports.GET(new Request('https://music.example/download'),{params:Promise.resolve({assetId})});
  return {response,filters,signatures};
}
test('ZIP download is scoped to project and signed as an attachment on demand',async()=>{
  const {response,filters,signatures}=await run();
  assert.equal(response.status,303);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(filters,[['id',assetId],['project_id','project'],['entity_type','track']]);
  assert.deepEqual(signatures[0],['GET','project/tracks/track/stems.zip',900,undefined,'mdagi mdagi files.zip']);
});
test('non-members, missing files and cross-project storage paths cannot obtain URLs',async()=>{
  for(const opts of [{member:false},{asset:null},{asset:{bucket_id:'r2',entity_id:'track',storage_path:'other/tracks/track/stems.zip'}}]){
    const {response,signatures}=await run(opts);assert.ok([403,404].includes(response.status));assert.equal(signatures.length,0);
  }
});
test('storage failures return a retryable response without leaking credentials',async()=>{
  const {response}=await run({fail:true});assert.equal(response.status,503);assert.equal(response.headers.get('location'),null);
});
