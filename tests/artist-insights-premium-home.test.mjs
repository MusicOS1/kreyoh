import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const dashboard=read('components/ecosystem/WorkspaceDashboard.tsx');
const home=read('components/ecosystem/ArtistHomePremium.tsx');
const gallery=read('components/ecosystem/ArtistHeroGallery.tsx');
const insights=read('lib/artistInsights.ts');
const css=read('components/ecosystem/ArtistHomePremium.module.css');
test('artist home uses one photo-led layout and no second project summary',()=>{
 assert.match(dashboard,/<ArtistHomePremium/);
 assert.doesNotMatch(dashboard,/<nav className=\{styles.artistActions\}/);
 assert.match(home,/projectHref=\{projectHref\}/);
});
test('photo slideshow uses only account photos and is manually controlled',()=>{
 assert.match(home,/profile\?\.photo_catalog/);
 assert.match(home,/profile\?\.hero_image_url/);
 assert.match(gallery,/aria-label="Previous photo"/);
 assert.match(gallery,/aria-label="Next photo"/);
 assert.doesNotMatch(gallery,/setInterval|setTimeout/);
});
test('qualified plays and follows are real, missing telemetry remains unknown',()=>{
 assert.match(insights,/\.from\("music_play_sessions"\)/);
 assert.match(insights,/\.not\("qualified_at","is",null\)/);
 assert.match(insights,/\.from\("fan_music_library"\)/);
 assert.match(insights,/\.eq\("artist_id",user\.id\)/);
 assert.match(home,/profile clicks and paid subscribers are not yet tracked/);
 assert.doesNotMatch(home,/24,892|3,420|8,116/);
});
test('responsive layout is scoped and does not modify player or payments',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:375px\)/);
});
