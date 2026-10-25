import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const code=ts.transpileModule(read("lib/professionalApplications.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const target={exports:{}};
new Function("require","module","exports",code)(require,target,target.exports);
const a=target.exports;
test("profession list prevents arbitrary privileged identities",()=>{
 assert.ok(a.validProfession("Artist"));
 assert.ok(a.validProfession("Videographer"));
 assert.ok(a.validProfession("A&R"));
 assert.equal(a.validProfession("Super Admin"),false);
 assert.equal(a.validProfession("all"),false);
});
test("application transitions are bounded and user-controlled edits stop after submission",()=>{
 assert.equal(a.canApplicantEdit("draft"),true);
 assert.equal(a.canApplicantEdit("changes_requested"),true);
 for(const status of ["submitted","under_review","approved","rejected"])assert.equal(a.canApplicantEdit(status),false);
 assert.equal(a.canReview("submitted","under_review"),true);
 assert.equal(a.canReview("under_review","approved"),true);
 assert.equal(a.canReview("under_review","changes_requested"),true);
 for(const state of ["draft","changes_requested","approved","rejected"])assert.equal(a.canReview(state,"approved"),false);
 assert.equal(a.canReview("submitted","super_admin"),false);
});
test("application inputs require valid public portfolio and bounded fields",()=>{
 const base={profession:"Producer",displayName:"Kareem Beats",bio:"Producer",skills:"mixing, beats, mixing",experienceYears:"3",portfolio:"https://example.com"};
 const parsed=a.parseApplicationFields(base);
 assert.deepEqual(parsed.skills,["mixing","beats"]);
 assert.equal(parsed.experience_years,3);
 for(const portfolio of ["javascript:alert(1)","file:///private","ftp://example.com","not-a-url"])
  assert.throws(()=>a.parseApplicationFields({...base,portfolio}));
 assert.throws(()=>a.parseApplicationFields({...base,profession:"Admin"}));
 assert.throws(()=>a.parseApplicationFields({...base,experienceYears:"100"}));
 assert.throws(()=>a.parseApplicationFields({...base,skills:"x".repeat(61)}));
});
test("schema availability diagnostics distinguish missing staging setup",()=>{
 assert.equal(a.missingApplicationsSchema({code:"42P01"}),true);
 assert.equal(a.missingApplicationsSchema({code:"PGRST205"}),true);
 assert.equal(a.missingApplicationsSchema({code:"42501"}),false);
});
test("staged SQL has server-only grants, RLS, audit trigger and no privilege assignment",()=>{
 const sql=read("database/session2_professional_applications.sql");
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/revoke all on public.professional_applications from public, anon, authenticated/i);
 assert.match(sql,/create trigger professional_application_transition/i);
 assert.doesNotMatch(sql,/grant (all|insert|update).* to authenticated/i);
});
