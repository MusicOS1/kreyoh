import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('project artists can register private songs through existing role checks',()=>{
 assert.match(read('app/tracks/reuseActions.ts'),/const createRoles = \[[^\]]*"Artist"\]/);
 assert.match(read('app/tracks/page.tsx'),/const trackCreateRoles = \[[^\]]*"Artist"\]/);
 assert.match(read('lib/workspaceDashboard.ts'),/canCreateTrack: workspace.roles.some/);
 assert.match(read('app/tracks/reuseActions.ts'),/project_id: project\.id/);
});
test('retries are idempotent and cannot adopt another user track',()=>{
 const form=read('components/TrackIntakeForm.tsx'),action=read('app/tracks/reuseActions.ts');
 assert.ok(form.indexOf('localStorage.setItem(intakeKey')<form.indexOf('prepareReusableTrackIntake(prep)'));
 assert.match(form,/prep\.set\("track_id",prepared\.current\.trackId\)/);
 assert.match(action,/trackError\?\.code==="23505"/);
 assert.match(action,/existing\.created_by===user\.id/);
});
test('mobile wizard does not validate invisible input fields and confirms privacy',()=>{
 const form=read('components/TrackIntakeForm.tsx');
 assert.match(form,/name="working_title"[^>]*required=\{step===1\}/);
 assert.match(form,/name="track_file"[^>]*required=\{step===1\}/);
 assert.match(form,/Your song is saved privately/);
});
test('preview Paystack callback cannot be overridden by production callback env',()=>{
 assert.match(read('lib/paystackPayments.ts'),/const value=previewHost\|\|process\.env\.PAYSTACK_SITE_URL/);
});
test('all modified TSX files parse',()=>{
 for(const path of ["app/tracks/reuseActions.ts","app/tracks/actions.ts","app/tracks/page.tsx","lib/workspaceDashboard.ts","components/TrackIntakeForm.tsx","lib/paystackPayments.ts","components/ReleaseAudienceActions.tsx"]){
  const ast=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(ast.parseDiagnostics,[],path);
 }
});
