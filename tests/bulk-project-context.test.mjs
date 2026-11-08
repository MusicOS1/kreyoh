import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const transpiled=ts.transpileModule(read("lib/bulkReleaseProject.ts"),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {formatBulkProjectDescription,readBulkProjectDescription}=await import(
 "data:text/javascript;base64,"+Buffer.from(transpiled).toString("base64")
);

test("project background, release context and audio quality round-trip in existing description",()=>{
 const details={releaseContext:"Previously unreleased",recordingQuality:"Unmastered",
  about:"Early mixes and experimental studio performances from Project 001.\nThese are not final mastered versions."};
 const description=formatBulkProjectDescription(details);
 assert.ok(description.length<2000);
 assert.deepEqual(readBulkProjectDescription(description),details);
});
test("existing song descriptions remain untouched and unlabelled",()=>{
 assert.equal(readBulkProjectDescription("A final mastered song."),null);
 assert.equal(readBulkProjectDescription(""),null);
 assert.equal(formatBulkProjectDescription({releaseContext:"",recordingQuality:"",about:""}),"");
});
test("early releases can be labelled honestly without misrepresenting unfinished masters",()=>{
 for(const stage of ["Demo recording","Rough mix","Unmastered","Mastered / release-ready"]){
  const description=formatBulkProjectDescription({releaseContext:"Studio work in progress",
   recordingQuality:stage,about:"The creative team is developing this sound."});
  assert.equal(readBulkProjectDescription(description)?.recordingQuality,stage);
 }
 assert.throws(()=>formatBulkProjectDescription({releaseContext:"",recordingQuality:"Certified by FACKTS",
  about:"Please publish."}),/Choose one/);
});
test("project description is bounded and cannot overwrite existing credits",()=>{
 assert.throws(()=>formatBulkProjectDescription({releaseContext:"",recordingQuality:"",about:"a".repeat(1501)}),/1,500/);
 const source=read("components/BulkReleaseImporter.tsx");
 assert.match(source,/form.set\("description",formatBulkProjectDescription/);
 assert.match(source,/form.set\("collection",collection\)/);
 assert.match(source,/Initial credits \(optional\)/);
 assert.doesNotMatch(source,/if\(!credits\.trim\(\)\)/);
 assert.match(source,/form.set\("credits",credits\.trim\(\)\)/);
 assert.match(source,/form.set\("rights","on"\)/);
});
test("quality disclosure is shown on existing fan song rows and song pages only",()=>{
 const row=read("components/streaming/StreamTrackRow.tsx");
 const page=read("app/billboard/[releaseId]/page.tsx");
 assert.match(row,/readBulkProjectDescription\(release\.description\)/);
 assert.match(row,/fs-project-quality-label/);
 assert.match(page,/readBulkProjectDescription\(r\.description\)/);
 assert.match(page,/About the project/);
 assert.match(page,/Recording labels supplied by the uploader/);
});
test("affected TS and JSX files parse without syntax errors",()=>{
 for(const path of ["lib/bulkReleaseProject.ts","components/BulkReleaseImporter.tsx",
  "components/ListenerExperience.tsx","components/streaming/StreamTrackRow.tsx",
  "app/billboard/[releaseId]/page.tsx"]){
  const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(tree.parseDiagnostics.map(e=>e.messageText),[],path);
 }
});
