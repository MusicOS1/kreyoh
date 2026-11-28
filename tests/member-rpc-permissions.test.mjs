import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';

const sql=file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
const memberFunctions={
 '20260823_fackts_music_operations.sql':['claim_beat(uuid,text)','release_beat_claim(uuid)'],
 '20260826_ranked_track_selection.sql':['record_track_listen(uuid,integer)','set_track_ranking(uuid,integer)'],
 '20260827_track_version_ballot.sql':['record_track_version_listen(uuid,integer)','set_track_version_ranking(uuid,integer)'],
 '20260823_control_room_infrastructure.sql':['touch_my_presence(text,uuid)']
};

test('member RPC grants restrict anonymous callers and retain signed-in presence updates',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create function auth.uid() returns uuid stable language sql as
   $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table beats(id uuid); create table beat_claims(id uuid);
   create table profiles(id uuid,last_active_at timestamptz);
   create table user_presence(user_id uuid primary key,current_path text,current_project_id uuid,status text,last_active_at timestamptz,updated_at timestamptz);`);
  for(const [file,signatures] of Object.entries(memberFunctions)){
   const source=sql(file);
   for(const signature of signatures){
    const name=signature.split('(')[0];
    const start=source.indexOf('create or replace function public.'+name+'(');
    assert.notEqual(start,-1,name);
    const end=source.indexOf('$$;',start);
    assert.notEqual(end,-1);
    await db.exec(source.slice(start,end+3));
    await db.exec('grant execute on function public.'+signature+' to anon');
   }
  }
  const migration=sql('20261126120000_member_rpc_permissions.sql');
  await db.exec(migration);await db.exec(migration);
  for(const signature of Object.values(memberFunctions).flat()){
   const {rows}=await db.query("select has_function_privilege('anon',$1,'execute') as anon,has_function_privilege('authenticated',$1,'execute') as member,has_function_privilege('service_role',$1,'execute') as service",['public.'+signature]);
   assert.deepEqual(rows,[{anon:false,member:true,service:true}],signature);
  }
  const id='00000000-0000-4000-8000-000000000012';
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec("set role authenticated;select touch_my_presence('/projects',null);reset role");
  const {rows}=await db.query('select user_id,current_path from user_presence');
  assert.deepEqual(rows,[{user_id:id,current_path:'/projects'}]);
 }finally{await db.close();}
});
