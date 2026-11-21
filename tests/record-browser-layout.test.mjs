import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/RecordBrowser.module.css',import.meta.url),'utf8');
test('search and sort controls keep space between text and fields',()=>{
  assert.match(source,/\.tools label\{[^}]*display:grid;gap:8px/);
  assert.match(source,/\.tools input,\.tools select\{[^}]*min-height:46px/);
  assert.match(source,/@media\(max-width:760px\)\{\.tools input,\.tools select\{font-size:16px/);
});