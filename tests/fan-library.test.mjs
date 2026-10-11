import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
const db=new PGlite();
await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table profiles(id uuid primary key);');
await db.exec(readFileSync(new URL('../supabase/migrations/20261011163144_fan_music_library.sql',import.meta.url),'utf8'));
test('fan libraries deny direct browser access and enable row security',async()=>{
 const{rows}=await db.query("select relrowsecurity from pg_class where relname='fan_music_library'");assert.equal(rows[0].relrowsecurity,true);
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from fan_music_library'),/permission denied/);await db.exec('reset role');}
});
test('fan libraries keep identical release IDs separate per account',async()=>{
 await db.exec("insert into profiles values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');insert into fan_music_library(user_id,kind,item_id) values('00000000-0000-0000-0000-000000000001','saved','00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000002','saved','00000000-0000-0000-0000-000000000003');");
 const{rows}=await db.query('select count(*)::int as count from fan_music_library');assert.equal(rows[0].count,2);
 await assert.rejects(db.exec("insert into fan_music_library(user_id,kind,item_id) values('00000000-0000-0000-0000-000000000001','admin','00000000-0000-0000-0000-000000000003')"),/check constraint/);
});
const code=ts.transpileModule(readFileSync(new URL('../lib/fanProfile.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const{isFanProfile}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('fan-only accounts get listening navigation, mixed creators keep their workspace',()=>{assert.equal(isFanProfile({creator_types:['Fan']}),true);assert.equal(isFanProfile({creator_types:['Fan','Artist']}),false);assert.equal(isFanProfile(null),false);assert.equal(isFanProfile({creator_types:[]}),false);});
