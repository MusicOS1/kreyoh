import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const nav=read('lib/workspaceExperience.ts');
const dashboard=read('components/ecosystem/WorkspaceDashboard.tsx');
const dashboardData=read('lib/workspaceDashboard.ts');
const beats=read('app/beats/page.tsx');
const production=read('app/production/page.tsx');
const room=read('app/workspace/page.tsx');
const tracks=read('app/tracks/page.tsx');

test('artist has visible Beat Library while beat upload remains role gated',()=>{
  assert.match(nav,/\['Beat Library', '\/beats'\]/);
  assert.match(dashboard,/href="\/beats"/);
  assert.match(dashboard,/canUploadBeat && <Link href="\/beats\?upload=1#upload-beat"/);
  assert.match(dashboardData,/canUploadBeat: Boolean\(projectIds.length\).*\['Super Admin','Project Lead','A&R','Producer'\]/);
  assert.match(beats,/id="upload-beat".*open=\{params.upload === "1"\}/);
  assert.match(beats,/canUpload && <details/);
});
test('only one full project listening player remains in the project tools',()=>{
  assert.match(tracks,/<TrackPlaylist/);
  assert.doesNotMatch(production,/<TrackPlaylist/);
  assert.doesNotMatch(room,/featuredTrackAudio|featuredTrackAssetsResult/);
  assert.match(room,/Open in project listening room/);
  assert.match(production,/Open the single project listening room/);
  // Listening to source beats is a different workflow and remains available.
  assert.match(room,/<BeatAudioPlayer/);
});
