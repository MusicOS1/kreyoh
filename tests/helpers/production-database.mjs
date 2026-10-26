import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
export const pid='00000000-0000-4000-8000-000000000001',track='00000000-0000-4000-8000-000000000002',lead='00000000-0000-4000-8000-000000000003',engineer='00000000-0000-4000-8000-000000000004',artist='00000000-0000-4000-8000-000000000005',outsider='00000000-0000-4000-8000-000000000006',session='00000000-0000-4000-8000-000000000007';
export async function productionDatabase(){
 const db=new PGlite();
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;
 create table profiles(id uuid primary key,full_name text,stage_name text,creator_types text[] default array['Fan'],account_status text default 'active',last_login_at timestamptz,last_active_at timestamptz,updated_at timestamptz default now());
 create table projects(id uuid primary key,name text,code text,description text,current_stage text,next_action text,owner_id uuid,target_release_date date,updated_at timestamptz default now(),status text default 'active',visibility text default 'private');
 create table project_members(id uuid primary key default gen_random_uuid(),project_id uuid,user_id uuid,status text default 'active',joined_at timestamptz default now());
 create table roles(id uuid primary key default gen_random_uuid(),name text unique);create table member_roles(project_member_id uuid,role_id uuid);
 create table tracks(id uuid primary key,project_id uuid,working_title text,track_code text,status text default 'in_development',development_status text default 'in_development',artwork_url text,artwork_storage_key text,created_at timestamptz default now(),updated_at timestamptz default now());
 create table project_assets(id uuid primary key default gen_random_uuid(),project_id uuid,entity_type text,entity_id uuid,uploaded_by uuid,bucket_id text,storage_path text,file_name text,mime_type text,asset_kind text,version_note text,visibility text default 'project',created_at timestamptz default now());
 create table project_tasks(id uuid primary key default gen_random_uuid(),project_id uuid,track_id uuid,session_id uuid,title text,description text,assignee_id uuid,created_by uuid,due_date date,status text default 'to_do',updated_at timestamptz default now());
 create table platform_events(id uuid primary key default gen_random_uuid(),user_id uuid,project_id uuid,event_name text,category text,entity_type text,entity_id uuid,metadata jsonb,created_at timestamptz default now());
 create table activity_log(id uuid primary key default gen_random_uuid(),project_id uuid,user_id uuid,action text,entity_type text,entity_id uuid,created_at timestamptz default now());
 create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid,project_id uuid,type text,title text,body text,entity_type text,entity_id uuid,created_at timestamptz default now());
 create table track_contributors(id uuid primary key default gen_random_uuid(),track_id uuid,user_id uuid,contribution_role text,approved boolean default false);
 create table track_split_plans(track_id uuid primary key,project_id uuid,status text,version integer default 1);
 create table track_splits(id uuid primary key default gen_random_uuid(),track_id uuid,contributor_id uuid,percentage numeric,status text);
 create table track_rights_checks(id uuid primary key default gen_random_uuid(),track_id uuid,check_key text,status text,evidence_note text);
 create table track_operational_issues(id uuid primary key default gen_random_uuid(),project_id uuid,track_id uuid,status text);
 create table studio_sessions(id uuid primary key,project_id uuid,track_id uuid,created_by uuid,producer_id uuid,engineer_id uuid,ar_id uuid,starts_at timestamptz default now(),status text default 'scheduled');
 create table session_participants(session_id uuid,user_id uuid,participant_role text,primary key(session_id,user_id));
 insert into profiles(id,full_name) values('${lead}','Test Project Lead'),('${engineer}','Test Engineer'),('${artist}','Test Artist'),('${outsider}','Test Outsider');
 insert into projects(id,name,code,owner_id,description)values('${pid}','Isolated production acceptance','LOCAL','${lead}','Synthetic fixtures only; no Project 001 data.');
 insert into tracks(id,project_id,working_title,track_code)values('${track}','${pid}','Fixture song','LOCAL-01');
 insert into roles(name)values('Project Lead'),('Engineer'),('Artist');
 insert into project_members(project_id,user_id)values('${pid}','${lead}'),('${pid}','${engineer}'),('${pid}','${artist}');
 insert into member_roles select m.id,r.id from project_members m cross join roles r where (m.user_id='${lead}' and r.name='Project Lead')or(m.user_id='${engineer}' and r.name='Engineer')or(m.user_id='${artist}' and r.name='Artist');
 insert into studio_sessions(id,project_id,track_id,created_by,engineer_id)values('${session}','${pid}','${track}','${lead}','${engineer}');
 insert into session_participants(session_id,user_id)values('${session}','${artist}');
 `);
 await db.exec('alter table project_assets enable row level security;grant select on project_assets,project_members to authenticated;');
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261026200516_creative_production_workflow.sql',import.meta.url),'utf8'));
 return db;
}
export async function mutate(db,actor,action,target,data={},revision=0,request=crypto.randomUUID(),project=pid){
 return (await db.query('select production_mutate($1,$2,$3,$4,$5,$6,$7) result',[project,actor,action,target,revision,data,request])).rows[0].result;
}
export async function addVersion(db,kind='mix',title='Fixture mix V1.wav'){
 const id=crypto.randomUUID(),key=`${pid}/tracks/${track}/${id}.wav`;
 await db.query("insert into production_uploads(id,project_id,track_id,user_id,storage_key,final_key,file_name,mime_type,byte_size,asset_kind)values($1,$2,$3,$4,$5,$5,$6,'audio/wav',48044,$7)",[id,pid,track,engineer,key,title,kind]);
 const result=await mutate(db,engineer,'register_upload',id,{key,size:48044,etag:'isolated-seed-etag'},0,id);
 return (await db.query('select * from project_assets where id=$1',[result.asset_id])).rows[0];
}
export async function readyEvidence(db){
 await db.query('update tracks set artwork_url=$1 where id=$2',['https://example.test/authorised-cover.webp',track]);
 await db.query("insert into track_contributors(track_id,user_id,contribution_role,approved)values($1,$2,'artist',true)",[track,artist]);
 await db.query("insert into track_split_plans(track_id,project_id,status)values($1,$2,'confirmed')",[track,pid]);
 await db.query("insert into track_splits(track_id,contributor_id,percentage,status)values($1,$2,100,'confirmed')",[track,artist]);
 await db.query("insert into track_rights_checks(track_id,check_key,status,evidence_note)select $1,k,'not_applicable','Isolated test evidence, never legal clearance.'from unnest(array['producer_agreement','beat_rights','songwriter_credits','samples_cleared','performer_approvals','master_ownership'])k",[track]);
}
