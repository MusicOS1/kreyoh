import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("fan Discover and Shows source files parse",()=>{
 for(const path of ["components/ListenerExperience.tsx","components/ArtworkOfTheWeek.tsx","components/ShowsLanding.tsx","app/shows/[id]/page.tsx","lib/artworkOfWeek.ts","lib/publicShowParticipants.ts"]){
  const s=read(path),parsed=ts.createSourceFile(path,s,ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(parsed.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("live fan content includes published Shows and legacy artwork on Discover",()=>{
 const home=read("components/ListenerExperience.tsx"),shows=read("components/ShowsLanding.tsx"),art=read("lib/artworkOfWeek.ts");
 assert.match(home,/ArtworkOfTheWeek feature=\{artworkOfWeek\}/);
 assert.match(home,/ShowsLanding items=\{editorial\}/);
 assert.match(shows,/x\.published/);
 assert.match(art,/isMisplacedArtworkHero/);
 assert.match(art,/const legacy=heroes\.profile/);
});
test("show participant links never expose private or disabled profiles",()=>{
 const s=read("lib/publicShowParticipants.ts"),page=read("app/shows/[id]/page.tsx");
 assert.match(s,/\.eq\("profile_visibility","public"\)/);
 assert.match(s,/\.eq\("account_status","active"\)/);
 assert.match(page,/if\(!item\)notFound\(\)/);
});
