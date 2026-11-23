import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('artist insights are scoped to the signed-in owner and approved periods',()=>{
 const metrics=read('lib/artistInsights.ts');
 assert.match(metrics,/periodDays:7\|30\|90=30/);
 assert.match(metrics,/\.eq\("artist_id",user\.id\)/);
 assert.match(metrics,/\.not\("qualified_at","is",null\)/);
 assert.match(metrics,/\.from\("music_release_likes"\)/);
 assert.match(metrics,/\.from\("music_release_comments"\)/);
 assert.match(metrics,/\.from\("fan_music_library"\)/);
});
test('missing numbers are not invented and payment records are not mislabelled earnings',()=>{
 const home=read('components/ecosystem/ArtistHomePremium.tsx');
 assert.match(home,/payouts and revenue shares remain unreported/);
 assert.match(home,/profile clicks and paid subscribers are not yet tracked/);
 assert.match(home,/aria-label="Artist insights date range"/);
 assert.match(home,/Distinct identifiable listeners/);
});
test('date filter flows through the existing artist workspace and charts scale to selected days',()=>{
 assert.match(read('app/workspaces/[kind]/page.tsx'),/insightDays:7\|30\|90/);
 assert.match(read('components/ecosystem/WorkspaceDashboard.tsx'),/insightDays=30/);
 assert.match(read('components/ecosystem/ArtistHomePremium.tsx'),/Math\.max\(1,\(insights\.days\?\.length\|\|1\)-1\)/);
});
test('modified artist insight files parse',()=>{
 for(const path of ["lib/artistInsights.ts","components/ecosystem/ArtistHomePremium.tsx","components/ecosystem/WorkspaceDashboard.tsx","app/workspaces/[kind]/page.tsx"]){
  const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics,[],path);
 }
});
