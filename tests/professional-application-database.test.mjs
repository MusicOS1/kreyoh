// Executes the committed application schema in isolated PostgreSQL, never production.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('application PostgreSQL: server-only grants, atomic audit, resubmission, foreign keys and isolation',async()=>{
 const db=new PGlite();
 const applicant='11111111-1111-4111-8111-111111111111',reviewer='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create table public.profiles(id uuid primary key);insert into profiles values('${applicant}'),('${reviewer}');`);
  await db.exec(readFileSync(new URL('../database/session2_professional_applications.sql',import.meta.url),'utf8'));
  const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
  const [{id}]=await query("insert into professional_applications(user_id,profession,display_name,bio) values($1,'Producer','Isolated creator','Independent production experience') returning id",[applicant]);
  assert.equal((await query('select * from professional_application_events')).length,0);
  for(const [status,actor,note] of [['submitted',null,null],['under_review',reviewer,'Review started'],['changes_requested',reviewer,'Please supply a portfolio'],['submitted',null,null],['approved',reviewer,'Evidence verified']]){
   await query('update professional_applications set status=$1,reviewed_by=$2,review_note=$3 where id=$4',[status,actor,note,id]);
  }
  const events=await query('select from_status,to_status,actor_id,note from professional_application_events order by created_at,id');
  assert.equal(events.length,5);
  const resubmission=events.find(e=>e.from_status==='changes_requested');assert.equal(resubmission.actor_id,applicant);assert.equal(resubmission.note,null);
  assert.ok(events.filter(e=>['under_review','changes_requested','approved'].includes(e.to_status)).every(e=>e.actor_id===reviewer));
  await assert.rejects(query("insert into professional_applications(user_id,profession,display_name) values($1,'Producer','Duplicate')",[applicant]),/unique/);
  await assert.rejects(query("insert into professional_applications(user_id,profession,display_name) values($1,'Super Admin','Escalation')",[applicant]),/check/);
  const rls=await query("select relrowsecurity from pg_class where relname in ('professional_applications','professional_application_events')");assert.ok(rls.every(r=>r.relrowsecurity));
  for(const role of ['anon','authenticated']){
   const [permissions]=await query(`select has_table_privilege('${role}','professional_applications','select') as read,has_table_privilege('${role}','professional_applications','update') as write,has_table_privilege('${role}','professional_application_events','insert') as event`);
   assert.deepEqual(permissions,{read:false,write:false,event:false});
   await db.exec('set role '+role);await assert.rejects(query('select * from professional_applications'),/permission denied/);await db.exec('reset role');
  }
  const [privileges]=await query("select has_table_privilege('service_role','professional_application_events','update') as update,has_table_privilege('service_role','professional_application_events','delete') as delete");assert.deepEqual(privileges,{update:false,delete:false});
  // If audit insertion fails, the status mutation must roll back with it.
  await db.exec("create function fail_event() returns trigger language plpgsql as $$begin raise exception 'isolated audit unavailable';end$$;create trigger fail_event before insert on professional_application_events for each row execute function fail_event();");
  await assert.rejects(query("update professional_applications set status='rejected' where id=$1",[id]),/audit unavailable/);
  assert.equal((await query('select status from professional_applications where id=$1',[id]))[0].status,'approved');
 }finally{await db.close();}
});
