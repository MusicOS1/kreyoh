import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("music hero settings & bulk release components parse",()=>{
 for(const path of [
  "lib/fanHero.ts","lib/fanHeroConfig.ts",
  "components/HeroAdminPanel.tsx","components/BulkReleaseImporter.tsx",
  "components/BulkReleaseApproval.tsx","components/ListenerExperience.tsx",
  "app/admin/(control)/discovery/hero-actions.ts",
  "app/admin/(control)/discovery/page.tsx",
  "app/admin/(control)/releases/actions.ts",
  "app/admin/(control)/releases/page.tsx",
  "app/admin/(control)/releases/bulk/page.tsx",
  "app/fan/page.tsx","app/listen/page.tsx","app/messages/page.tsx"
 ]){
  const source=read(path);
  const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,
    path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0,path+": "+parsed.parseDiagnostics.map(x=>x.messageText).join(","));
 }
});
test("public throttling stays in place while music admin can import a catalogue",()=>{
 const source=read("app/billboard/actions.ts");
 assert.match(source,/hasControlRoomPermission\(user.id,'music'\)/);
 assert.match(source,/catalogAdmin\?1000:10/);
 assert.match(source,/count\|\|0/);
 assert.match(source,/rights/);
});
test("upload is sequential with visibility into every failure and rights consent",()=>{
 const source=read("components/BulkReleaseImporter.tsx");
 assert.match(source,/valid\.slice\(0,100\)/);
 assert.match(source,/await prepareReleaseResult\(form\)/);
 assert.match(source,/await finishReleaseResult\(draft.id\)/);
 assert.match(source,/for\(const row of queue\)/);
 assert.match(source,/stopRef.current/);
 assert.match(source,/rights/);
});
test("admin hero settings are protected and editable across nine destinations",()=>{
 const client=read("components/HeroAdminPanel.tsx");
 const server=read("app/admin/(control)/discovery/hero-actions.ts");
 const model=read("lib/fanHeroConfig.ts");
 assert.match(server,/requireControlRoomPermission\("music"\)/);
 assert.match(server,/music_weekly_chart/);
 assert.match(server,/system_settings/);
 assert.match(client,/Publish custom hero/);
 assert.match(client,/published song cover/);
 for(const id of ["for-you","albums","shows","billboard","library","following","recent","profile","inbox"]){
  assert.ok(model.includes('id:"'+id+'"'));
 }
});
test("client components never import the server-only database model",()=>{
 for(const path of ["components/HeroAdminPanel.tsx","components/ListenerExperience.tsx"]){
  assert.doesNotMatch(read(path),/from ["']\.\.\/lib\/fanHero["']/);
 }
});
