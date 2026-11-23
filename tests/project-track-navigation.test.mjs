import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('artist sees all authorised projects, while tracks remain scoped to current',()=>{
 const home=read('components/ecosystem/ArtistHomePremium.tsx');
 const dash=read('lib/workspaceDashboard.ts');
 const nav=read('components/ProjectTracksNavigator.tsx');
 const action=read('app/projects/actions.ts');
 assert.match(home,/<ProjectTracksNavigator projects=\{availableProjects\}/);
 assert.match(dash,/availableProjects:.*permittedIds.includes/);
 assert.match(nav,/action=\{selectProject\}/);
 assert.match(nav,/name="next" value="\/tracks"/);
 assert.match(action,/\.eq\("user_id", user\.id\)\.eq\("project_id", projectId\)\.eq\("status", "active"\)/);
 assert.match(dash,/const projectIds = selectedId && permittedIds.includes\(selectedId\)/);
});
test('project player persists independently and no other project audio is queried',()=>{
 const tracks=read('app/tracks/page.tsx');
 assert.match(tracks,/\.eq\("project_id", project\.id\)/);
 assert.match(tracks,/fackts-project-player:/);
 assert.match(tracks,/id="project-player"/);
 assert.match(tracks,/id="project-tracks"/);
 assert.match(tracks,/No playable recordings in \{project\.name\} yet/);
 assert.match(tracks,/tracksError\|\|assetsResult.error/);
});
test('visible artist navigation exposes Tracks on phone and workspace',()=>{
 assert.match(read('components/ecosystem/EcosystemFrame.tsx'),/label: 'Tracks', href: '\/tracks#project-player'/);
 assert.match(read('lib/workspaceExperience.ts'),/\['My project tracks', '\/tracks#project-player'\]/);
 assert.match(read('components/ecosystem/ArtistHeroGallery.tsx'),/Open tracks & player/);
});
test('modified TypeScript and TSX parse',()=>{
 for(const path of ["lib/workspaceDashboard.ts","components/ecosystem/WorkspaceDashboard.tsx","components/ecosystem/ArtistHomePremium.tsx","components/ecosystem/ArtistHeroGallery.tsx","components/ecosystem/EcosystemShell.tsx","components/ecosystem/EcosystemFrame.tsx","lib/workspaceExperience.ts","app/tracks/page.tsx","components/MusicQueue.tsx","components/ProjectTracksNavigator.tsx"]){
 const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.deepEqual(ast.parseDiagnostics,[],path);
 }
});
