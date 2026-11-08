import {test} from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../lib/releaseArtistMatch.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exported={};
new Function("exports",js)(exported);
const {releaseHasArtist}=exported;
const joseph="27ccbdf0-6561-4c13-a846-3844c2deab40";
const performer="a49df16b-a2c6-4ae7-9a7b-1d5e1273771b";

test("admin-managed catalogue never attributes a release to legacy uploader",()=>{
 const release={artist_id:joseph,artist_name:"FACKTS Music",is_platform_managed:true};
 assert.equal(releaseHasArtist(release,joseph,"Joseph Millighan"),false);
 assert.equal(releaseHasArtist(release,performer,"Greg West"),false);
});
test("admin-managed catalogue can attribute only explicit verified performers",()=>{
 const release={artist_id:joseph,artist_name:"FACKTS Music",is_platform_managed:true,verified_artist_ids:[performer]};
 assert.equal(releaseHasArtist(release,performer,"Greg West"),true);
 assert.equal(releaseHasArtist(release,joseph,"Joseph Millighan"),false);
});
test("existing independently verified performer attribution remains effective",()=>{
 const release={artist_id:joseph,artist_name:"FACKTS Music",is_platform_managed:true,attributed_artist_profile_id:performer};
 assert.equal(releaseHasArtist(release,performer,"Greg West"),true);
});
test("genuine non-managed artist releases still work",()=>{
 const release={artist_id:joseph,artist_name:"Joseph Millighan",is_platform_managed:false};
 assert.equal(releaseHasArtist(release,joseph,"Joseph Millighan"),true);
 assert.equal(releaseHasArtist(release,performer,"Greg West"),false);
});
test("historical migration preserves original tracks, media and Joe-credited releases",()=>{
 const migration=readFileSync(new URL("../supabase/migrations/20261108_catalogue_custody_release_claims.sql",import.meta.url),"utf8");
 assert.match(migration,/lower\(btrim\(r\.artist_name\)\) = 'fackts music'/);
 assert.match(migration,/is_platform_managed = true/);
 assert.doesNotMatch(migration,/\bdelete\s+from\b|\btruncate\b|\bdrop\s+table\b/i);
 assert.match(migration,/professional_claims_release_queue_idx/);
});
