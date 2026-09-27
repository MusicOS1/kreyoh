import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../lib/navigation.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {safeNext,notificationLink}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('safe return paths preserve project context and reject external redirects',()=>{
  for(const unsafe of ['//example.com','https://example.com','/\\example.com','/login','/auth/signout','/\t/example.com']) assert.equal(safeNext(unsafe),'/home');
  assert.equal(safeNext('/splits?track=123#review'),'/splits?track=123#review');
});
test('split notifications select their project and exact song',()=>{
  const url = new URL(notificationLink({type:'split_confirmation_required',project_id:'project-b',entity_id:'song-a',entity_type:'track'}),'https://example.com');
  assert.equal(url.pathname,'/project-entry');assert.equal(url.searchParams.get('project_id'),'project-b');assert.equal(url.searchParams.get('next'),'/splits?track=song-a');
  assert.equal(notificationLink({type:'project_invitation',project_id:'x'}),'/invitations');
});
test('email callbacks are public; normal sign-in preserves next',()=>{
  const proxy=readFileSync(new URL('../lib/supabase/proxy.ts',import.meta.url),'utf8');
  assert.match(proxy,/PUBLIC_ROUTES\s*=\s*\[[\s\S]*?"\/auth\/callback"/);
  const login=readFileSync(new URL('../app/login/actions.ts',import.meta.url),'utf8');
  assert.match(login,/redirect\(next\)/);
});
