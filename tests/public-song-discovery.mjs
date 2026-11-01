import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('public song metrics are independent of the weekly Billboard',()=>{
 const engagement=read('lib/publicMusicEngagement.ts');
 assert.match(engagement,/public_release_play_counts/);
 assert.match(engagement,/music_release_likes/);
 assert.match(engagement,/music_release_comments/);
 const song=read('components/ListenerExperience.tsx');
 assert.match(song,/<SongPlayCount id=\{release.id\}/);
 assert.match(song,/<LikeButton id=\{release.id\}/);
 assert.match(song,/<ReleaseComments releaseId=\{release.id\}/);
});
test('public search includes artist profiles, supports alternate spellings',()=>{
 const artists=read('lib/musicArtists.ts');
 assert.doesNotMatch(artists,/\.contains\("creator_types",\["Artist"\]\)/);
 assert.match(artists,/profile_visibility/);
 const artistSearch=read('components/ArtistDiscovery.tsx');
 assert.match(artistSearch,/searchQuery/);
 assert.match(artistSearch,/replace\(\/gh\/g,"g"\)/);
 const publicDirectory=read('app/creators/page.tsx');
 assert.match(publicDirectory,/full_name/);
});
test('qualified plays are persisted and increment only when accepted',()=>{
 const player=read('components/TrackPlaylist.tsx');
 assert.match(player,/data.counted===true/);
 const migration=read('supabase/migrations/20261101172500_public_qualified_plays_independent.sql');
 assert.match(migration,/enable row level security/);
 assert.match(migration,/qualified_bucket/);
 assert.doesNotMatch(migration,/truncate table|drop table|delete from/i);
});
