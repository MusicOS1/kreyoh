import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import ts from "typescript";

const migration=readFileSync(new URL("../supabase/migrations/20261011195500_music_release_comments.sql",import.meta.url),"utf8");
const db=new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table public.profiles(id uuid primary key); create table public.music_releases(id uuid primary key);");
await db.exec(migration);
const uuid=n=>"00000000-0000-0000-0000-"+String(n).padStart(12,"0");
await db.exec("insert into profiles(id) values('"+uuid(1)+"'),('"+uuid(2)+"');insert into music_releases(id) values('"+uuid(3)+"'),('"+uuid(4)+"');");

test("song conversations only accept service role access and enable RLS",async()=>{
  const {rows}=await db.query("select relrowsecurity from pg_class where relname='music_release_comments'");
  assert.equal(rows[0].relrowsecurity,true);
  for(const role of ["anon","authenticated"]){
    assert.equal((await db.query("select has_table_privilege('"+role+"','public.music_release_comments','SELECT') as allowed")).rows[0].allowed,false);
    assert.equal((await db.query("select has_table_privilege('"+role+"','public.music_release_comments','INSERT') as allowed")).rows[0].allowed,false);
  }
  assert.equal((await db.query("select has_table_privilege('service_role','public.music_release_comments','SELECT,INSERT,UPDATE,DELETE') as allowed")).rows[0].allowed,true);
});

test("replies, comment size and release boundaries have database constraints",async()=>{
  await db.exec("insert into music_release_comments(id,release_id,author_id,body) values('"+uuid(5)+"','"+uuid(3)+"','"+uuid(1)+"','First listen!')");
  await db.exec("insert into music_release_comments(id,release_id,author_id,parent_id,body) values('"+uuid(6)+"','"+uuid(3)+"','"+uuid(2)+"','"+uuid(5)+"','I agree')");
  assert.equal((await db.query("select count(*)::int as count from music_release_comments")).rows[0].count,2);
  await assert.rejects(db.exec("insert into music_release_comments(release_id,author_id,body) values('"+uuid(3)+"','"+uuid(1)+"','  ')"),/check constraint/i);
  await assert.rejects(db.exec("insert into music_release_comments(release_id,author_id,body) values('"+uuid(3)+"','"+uuid(1)+"','"+("x".repeat(601))+"')"),/check constraint/i);
  await db.exec("update music_release_comments set deleted_at=now() where id='"+uuid(5)+"'");
  assert.equal((await db.query("select count(*)::int as count from music_release_comments where parent_id='"+uuid(5)+"'")).rows[0].count,1);
  await db.exec("delete from music_releases where id='"+uuid(3)+"'");
  assert.equal((await db.query("select count(*)::int as count from music_release_comments")).rows[0].count,0);
});

test("fan comment and music player components parse as TypeScript JSX",()=>{
  for(const path of ["../components/ReleaseComments.tsx","../components/ListenerExperience.tsx","../components/TrackPlaylist.tsx","../app/release-comments/actions.ts"]){
    const source=readFileSync(new URL(path,import.meta.url),"utf8");
    const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    assert.equal(file.parseDiagnostics.length,0,path+": "+file.parseDiagnostics.map(d=>d.messageText).join(", "));
  }
  const player=readFileSync(new URL("../components/TrackPlaylist.tsx",import.meta.url),"utf8");
  const feed=readFileSync(new URL("../components/ListenerExperience.tsx",import.meta.url),"utf8");
  assert.match(player,/if\(restartCurrent\)\{p.currentTime=0;/);
  assert.match(player,/else togglePlayback\(\)/);
  assert.match(readFileSync(new URL("../components/ListeningProvider.tsx",import.meta.url),"utf8"),/playRequest=\{playRequest\}/);
  assert.match(feed,/ReleaseComments releaseId=\{r.id\}/);
});
