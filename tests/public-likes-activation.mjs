import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('public likes are not conflated with fan music library saves',()=>{
 const ui=file('components/ListenerExperience.tsx');
 assert.match(ui, /<LikeButton id=\{release\.id\}/);
 assert.match(ui,/change\('saved',release\.id/);
 assert.match(ui,/count=\{release\.likes\?\?null\}/);
});
test('the like route supports the current published-release schema and verifies artists',()=>{
 const route=file('app/api/listening/likes/route.ts');
 assert.match(route,/music_weekly_chart'\)\.select\('id,artist_id'\)/);
 assert.doesNotMatch(route,/select\('id,artist_id,featured_artist_ids'\)/);
 assert.match(route,/user\.id===release\.artist_id/);
 assert.match(route,/music_release_likes/);
 assert.match(route,/count:'exact'/);
});
test('additive likes migration has RLS and audit history',()=>{
 const sql=file('supabase/migrations/20261101132000_public_song_likes_independent_rollout.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/music_like_events/);
 assert.match(sql,/music_capture_like/);
 assert.doesNotMatch(sql,/drop table|truncate table|delete from public\.music_releases/i);
});
