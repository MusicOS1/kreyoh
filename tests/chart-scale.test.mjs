import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

function load(filename,dependencies={}){
 const source=readFileSync(new URL('../lib/'+filename,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const module={exports:{}};
 new Function('require','module','exports',outputText)(name=>dependencies[name]||{},module,module.exports);
 return module.exports;
}

test('Billboard retains the entire searchable queue and ranks across catalogue pages',async()=>{
 const rows=Array.from({length:2151},(_,index)=>({
  id:'00000000-0000-4000-8000-'+String(index).padStart(12,'0'),
  votes:0,release_at:'2026-01-01',title:'Release '+index
 }));
 const last=rows.at(-1).id;
 const ranges=[],rpcSizes=[],linkSizes=[];
 const admin={
  from(name){
   if(name==='music_weekly_chart'){
    const q={select:()=>q,order:()=>q,range:(start,end)=>{
     ranges.push(start);return {data:rows.slice(start,end+1)};
    }};
    return q;
   }
   let batch;
   assert.equal(name,'music_catalogue_attributions');
   const q={select:()=>q,in:(field,ids)=>{batch=ids;linkSizes.push(ids.length);return q;},eq:()=>q,
    not:()=>({data:batch.includes(last)?[{release_id:last,credited_artist_profile_id:'artist'}]:[]})};
   return q;
  },
  rpc(name,{p_release_ids:ids}){
   assert.equal(name,'public_release_play_counts');rpcSizes.push(ids.length);
   return {data:ids.includes(last)?[{release_id:last,plays:'9'}]:[]};
  }
 };
 const {chart}=load('community.ts',{'./recordReads':load('recordReads.ts'),'./supabase/admin':{createAdminClient:()=>admin}});
 const result=await chart();
 assert.deepEqual(ranges,[0,1000,2000]);
 assert.ok(Math.max(...rpcSizes,...linkSizes)<=100);
 assert.deepEqual(linkSizes,rpcSizes);
 assert.equal(result.length,rows.length);assert.equal(new Set(result.map(r=>r.id)).size,rows.length);
 assert.deepEqual(result[0],{...rows.at(-1),plays:9,attributed_artist_profile_id:'artist'});
 assert.equal(result[1].id,rows[0].id);assert.equal(result[1].plays,0);
});
