import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public and admin reports use one real public plays source',()=>{
 const report=read('lib/publicMusicReporting.ts');
 assert.match(report,/public_music_play_stats/);
 assert.match(report,/public_music_artist_audience/);
 assert.match(report,/public_music_platform_audience/);
 const admin=read('app/admin/(control)/billboard-analytics/page.tsx');
 assert.doesNotMatch(admin,/billboard_metrics/);
 assert.match(admin,/publicPlayStats/);
 assert.match(admin,/period_listeners/);
 const engagement=read('lib/publicMusicEngagement.ts');
 assert.match(engagement,/lifetime_plays/);
});
test('artist play figures are scoped to their published credits',()=>{
 const privateView=read('app/artist/insights/page.tsx');
 assert.match(privateView,/releaseHasArtist/);
 assert.match(privateView,/viewer\(\)/);
 assert.match(privateView,/No public releases linked/);
 const discovery=read('components/ArtistDiscovery.tsx');
 assert.match(discovery,/artistNumbers\.plays/);
});
test('failed play start retries and old private listens are not public streams',()=>{
 const meter=read('components/TrackPlaylist.tsx');
 assert.match(meter,/meter\.phase==='failed'/);
 assert.match(meter,/fm-public-qualified-play/);
 const sql=read('supabase/migrations/20261101183000_public_music_reporting.sql');
 assert.match(sql,/security invoker/);
 assert.match(sql,/music_play_sessions/);
 assert.doesNotMatch(sql,/track_version_listens|track_listens/);
});
