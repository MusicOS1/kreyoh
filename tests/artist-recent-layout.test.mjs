import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('components/ecosystem/ArtistHomePremium.module.css');
const home=read('components/ecosystem/ArtistHomePremium.tsx');
test('single artist home retains recent artwork, copy and arrow',()=>{
 for(const name of ['recentArtwork','recentCopy','rowArrow'])assert.match(home,new RegExp('styles\\.'+name));
 assert.match(css,/\.recentRow\{[^}]*grid-template-columns:48px minmax\(0,1fr\) 20px/);
 assert.match(css,/\.recentCopy\{[^}]*min-width:0/);
});
test('recent project music is scoped to selected project and mobile layout',()=>{
 const source=read('lib/workspaceDashboard.ts');
 assert.match(source,/const projectIds = selectedId && permittedIds.includes\(selectedId\) \? \[selectedId\] : \[\]/);
 assert.match(home,/hasCurrentProject&&<section className=\{styles\.recent\}/);
 assert.match(home,/No project tracks yet/);
 assert.match(css,/@media\(max-width:850px\).*recentGrid\{grid-template-columns:minmax\(0,1fr\)/);
});
