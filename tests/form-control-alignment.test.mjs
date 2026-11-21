import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('app/form-control-alignment.css');
const layout=read('app/layout.tsx');
const beats=read('components/BeatUploadForm.tsx');
const queue=read('components/MusicQueue.tsx');
test('shared form styles are loaded after old theme files',()=>{
  assert.ok(layout.indexOf('import "./form-control-alignment.css";')>layout.indexOf('import "./mixtape-ui.css";'));
});
test('beat fields stack label and input and use safe mobile columns',()=>{
  assert.match(css,/\.beat-registration-form\s*>\s*label[\s\S]*?display:\s*grid/);
  assert.match(css,/\.beat-registration-form\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css,/@media\s*\(max-width:\s*760px\)[\s\S]*?\.beat-registration-form\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(beats,/name="audio_file"/);
});
test('search actions do not span the entire grid',()=>{
  assert.match(css,/\.operations-form\[role="search"\]\s*\{[^}]*display:\s*flex/);
  assert.match(css,/\.operations-form\[role="search"\]\s*>\s*button\s*\{[^}]*width:\s*auto/);
  assert.match(css,/@media\s*\(max-width:\s*760px\)[\s\S]*?\.operations-form\[role="search"\]\s*>\s*button\s*\{[^}]*width:\s*100%/);
});
test('playlist controls keep separate label and input spacing',()=>{
  assert.match(css,/\.queue-library\s+\.library-toolbar\s*\{[^}]*display:\s*grid/);
  assert.match(css,/\.queue-library\s+\.playlist-editor\s*>\s*label[\s\S]*?display:\s*grid/);
  assert.match(css,/\.queue-library\s+\.playlist-editor-columns\s*\{[^}]*minmax\(0,\s*1fr\)/);
  assert.match(queue,/className="queue-library compact-library"/);
});