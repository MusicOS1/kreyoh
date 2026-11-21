import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../components/ecosystem/WorkspaceDashboard.module.css',import.meta.url),'utf8');
const artist=readFileSync(new URL('../components/ecosystem/WorkspaceDashboard.tsx',import.meta.url),'utf8');

test('recent music grid uses named artwork, copy and arrow rather than blanket span placement',()=>{
  assert.doesNotMatch(css,/\.artistRecentList\s+span\s*\{[^}]*grid-/s);
  assert.doesNotMatch(css,/\.artistRecentList\s+small\s*\{[^}]*grid-/s);
  assert.match(css,/\.artistTrackArtwork\s*\{[^}]*grid-column:1/s);
  assert.match(css,/\.artistTrackCopy\s*\{[^}]*grid-column:2/s);
  assert.match(css,/\.artistTrackArrow\s*\{[^}]*grid-column:3/s);
  for(const name of ['artistTrackArtwork','artistTrackCopy','artistTrackArrow']) {
    assert.match(artist,new RegExp('styles\\.'+name));
  }
});

test('recent music retains safe phone columns and min-width containment',()=>{
  assert.match(css,/\.artistHome\s+\.artistRecentList\s+a\s*\{[^}]*grid-template-columns:54px minmax\(0,1fr\) 24px/s);
  assert.match(css,/@media\(max-width:760px\)\s*\{[^}]*\.artistHome\s+\.artistRecentList\s+a\s*\{[^}]*grid-template-columns:50px minmax\(0,1fr\) 20px/s);
  assert.match(css,/\.artistTrackCopy\s*\{[^}]*min-width:0/s);
  assert.match(css,/\.artistTrackArtwork\s*\{[^}]*overflow:hidden/s);
});
