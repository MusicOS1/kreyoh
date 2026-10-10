import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const [artist,fan,other,unverified,release,draft,future,project]=[1,2,3,4,5,6,7,8].map(id);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create table public.profiles(id uuid primary key,account_status text,profile_visibility text);
create table public.project_members(project_id uuid,user_id uuid,status text);
grant usage on schema auth to service_role;grant select on auth.users,public.profiles,public.project_members to service_role;
insert into auth.users values('${artist}',now()),('${fan}',now()),('${other}',now()),('${unverified}',null);
insert into profiles values('${artist}','active','public'),('${fan}','active','project'),('${other}','active','project'),('${unverified}','active','public');`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261010191541_public_releases_and_member_messages.sql',import.meta.url),'utf8'));
await db.exec(`insert into music_releases(id,artist_id,title,artist_name,audio_key,audio_type,status,rights_confirmed_at,release_at) values
('${release}','${artist}','Released','Artist','release','audio/mpeg','published',now(),now()),
('${draft}','${artist}','Draft','Artist','draft','audio/mpeg','draft',null,now()),
('${future}','${artist}','Scheduled','Artist','future','audio/mpeg','published',now(),now()+interval '1 day');`);
const vote=(user,r=release,on=true)=>db.query('select set_music_vote($1,$2,$3)',[user,r,on]);
const send=(from,to,body='Hello')=>db.query('select send_member_message($1,$2,$3)',[from,to,body]);
const block=(from,to,on)=>db.query('select set_member_block($1,$2,$3)',[from,to,on]);
test('public releases, votes and private messages enforce database boundaries',async()=>{
 const chart=await db.query('select * from music_weekly_chart');assert.equal(chart.rows.length,1);assert.equal(chart.rows[0].id,release);assert.equal('audio_key' in chart.rows[0],false);
 await assert.rejects(vote(artist),/own release/);await assert.rejects(vote(fan,draft),/not available/);await assert.rejects(vote(fan,future),/not available/);
 await vote(fan);await vote(fan);assert.equal((await db.query('select votes from music_weekly_chart')).rows[0].votes,1);
 await db.exec(`insert into music_votes(release_id,user_id,week_start) values('${release}','${other}',(date_trunc('week',now() at time zone 'Africa/Nairobi')-interval '7 days')::date)`);
 assert.equal((await db.query('select votes from music_weekly_chart')).rows[0].votes,1);await vote(fan,release,false);assert.equal((await db.query('select votes from music_weekly_chart')).rows[0].votes,0);
 await assert.rejects(send(fan,other),/public creator/);await assert.rejects(send(fan,fan),/another member/);await assert.rejects(send(fan,artist,' '),/characters/);
 await send(fan,artist);await send(artist,fan,'Reply to a private fan');
 await block(fan,artist,true);await assert.rejects(send(artist,fan),/unavailable/);await assert.rejects(send(fan,artist),/unavailable/);await block(fan,artist,false);await send(fan,artist);
 await db.exec(`insert into project_members values('${project}','${fan}','active'),('${project}','${other}','active')`);await send(fan,other,'Project chat');
 for(let i=0;i<7;i++)await send(fan,artist);await assert.rejects(send(fan,artist),/wait a minute/);
 for(const table of ['music_releases','music_votes','member_messages','member_blocks']){
 assert.equal((await db.query(`select relrowsecurity from pg_class where relname='${table}'`)).rows[0].relrowsecurity,true);
 for(const role of ['anon','authenticated'])assert.equal((await db.query(`select has_table_privilege('${role}','public.${table}','select') as allowed`)).rows[0].allowed,false);
 }
 for(const fn of ['set_music_vote(uuid,uuid,boolean)','send_member_message(uuid,uuid,text)','set_member_block(uuid,uuid,boolean)']){
 assert.equal((await db.query(`select has_function_privilege('authenticated','${fn}','execute') as allowed`)).rows[0].allowed,false);
 }
 await db.exec('set role service_role');await vote(other);await send(other,fan,'Service role executes with its own permissions');await db.exec('reset role');
});
