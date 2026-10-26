// Prepared safety patch verification; never applies schema or writes to production.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('prepared platform governance trigger: authority, self-protection and atomic permission audit',async()=>{
 const db=new PGlite();const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
 try{
  await db.exec(`create role anon;create role authenticated;create table control_room_admins(user_id uuid primary key,active boolean not null,permissions text[] not null,granted_by uuid);create table platform_events(user_id uuid,event_name text,category text,entity_type text,entity_id uuid,metadata jsonb);insert into control_room_admins values('${a}',true,array['all'],null),('${b}',true,array['all'],null);`);
  await db.exec(readFileSync(new URL('../database/session2_admin_safety.sql',import.meta.url),'utf8'));
  await assert.rejects(db.query('update control_room_admins set active=false,granted_by=$1 where user_id=$1',[a]),/own full/);
  await assert.rejects(db.query('insert into control_room_admins values($1,true,$2,$1)',[c,['all']]),/active full/);
  await db.query('insert into control_room_admins values($1,true,$2,$3)',[c,['people'],a]);
  assert.equal((await db.query("select count(*)::int count from platform_events where event_name='control_room_access_changed'")).rows[0].count,1);
  await db.query('update control_room_admins set active=false,granted_by=$1 where user_id=$2',[a,b]);
  await assert.rejects(db.query('update control_room_admins set active=false,granted_by=$1 where user_id=$2',[b,a]),/active full/);
  await assert.rejects(db.query('delete from control_room_admins where user_id=$1',[c]),/instead of deleting/);
  await db.exec("create function fail_event() returns trigger language plpgsql as $$begin raise exception 'isolated audit failure';end$$;create trigger fail_event before insert on platform_events for each row execute function fail_event();");
  await assert.rejects(db.query('update control_room_admins set permissions=$1,granted_by=$2 where user_id=$3',[['music'],a,c]),/audit failure/);
  assert.deepEqual((await db.query('select permissions from control_room_admins where user_id=$1',[c])).rows[0].permissions,['people']);
 }finally{await db.close();}
});
