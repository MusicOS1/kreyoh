import {test} from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
const source=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("public artist discovery and model preserve valid TS/TSX syntax",()=>{
 for(const file of ["components/ArtistDiscovery.tsx","lib/musicArtists.ts","lib/musicArtistsTypes.ts"]){
  const parsed=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true,file.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(parsed.parseDiagnostics.map(x=>x.messageText),[],file);
 }
});
test("fan-facing artist pages surface public story, picks, photos, interview and links",()=>{
 const m=source("lib/musicArtists.ts"),view=source("components/ArtistDiscovery.tsx");
 for(const field of ["top_songs","photo_catalog","interview_title","interview_url","social_links","streaming_links","achievements"])assert.ok(m.includes(field),field);
 for(const tag of ["fan-artist-music","fan-artist-story","fan-artist-picks","fan-artist-gallery","fan-artist-interview","fan-artist-highlights"])assert.ok(view.includes(tag),tag);
 assert.match(view,/onFollow\(selectedArtist\.id\)/);
 assert.match(view,/onPlay\(release\)/);
 assert.match(view,/releaseHasArtist\(release,artist\.id,artist\.name\)/);
 assert.match(m,/\.contains\("creator_types",\["Artist"\]\)/);
});
test("public artist links are validated and artist picks never become automatic performer credits",()=>{
 const m=source("lib/musicArtists.ts"),view=source("components/ArtistDiscovery.tsx");
 assert.match(m,/\["https:","http:"\]/);
 assert.match(view,/These are not automatically counted as their own releases/);
 assert.match(view,/No verified FACKTS releases/);
});
