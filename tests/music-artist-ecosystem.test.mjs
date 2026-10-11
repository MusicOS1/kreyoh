import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const sourceFiles=[
 "components/ArtistDiscovery.tsx","components/ListenerExperience.tsx",
 "components/FanMobileTabs.tsx","components/FanShell.tsx","components/ShellLayout.tsx",
 "lib/musicArtists.ts","lib/musicArtistsTypes.ts","lib/fanHeroConfig.ts",
 "app/fan/page.tsx","app/listen/page.tsx","app/creators/page.tsx",
 "app/creators/[userId]/page.tsx","app/auth/callback/route.ts",
 "app/signup/actions.ts","app/billboard/submit/page.tsx"
];

test("unified artist listening and routes parse as TypeScript/TSX",()=>{
 for(const name of sourceFiles){
  const file=ts.createSourceFile(name,read(name),ts.ScriptTarget.Latest,true,name.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length,0,name+": "+file.parseDiagnostics.map(d=>d.messageText).join("; "));
 }
});
test("fans browse artists, play and follow without leaving the current audio tree",()=>{
 const experience=read("components/ListenerExperience.tsx");
 const discovery=read("components/ArtistDiscovery.tsx");
 assert.match(experience,/tab==='Artists'&&<ArtistDiscovery/);
 assert.match(experience,/onPlay=\{play\}/);
 assert.match(experience,/started&&queue\.length>0/);
 assert.match(discovery,/onFollow\(selectedArtist\.id\)/);
 assert.match(discovery,/onPlay\(release\)/);
 assert.match(discovery,/catalogueOnly/);
});
test("only explicitly public artist profiles can be used for rich discovery",()=>{
 const model=read("lib/musicArtists.ts");
 assert.match(model,/eq\("profile_visibility","public"\)/);
 assert.match(model,/eq\("account_status","active"\)/);
 assert.match(model,/contains\("creator_types",\["Artist"\]\)/);
 assert.match(read("app/creators/[userId]/page.tsx"),/music_weekly_chart/);
});
test("fan authentication preserves return locations without taking artists out of workspace",()=>{
 const fan=read("app/fan/page.tsx");
 const login=read("app/login/actions.ts");
 const callback=read("app/auth/callback/route.ts");
 assert.match(fan,/return fanOnly\?<FanShell/);
 assert.match(fan,/:<AppShell>\{listening\}<\/AppShell>/);
 assert.match(login,/next==="\u002fhome"&&isFanProfile/);
 assert.match(callback,/next==="\u002fhome"&&isFanProfile/);
});
test("artists have a phone tab and an editable hero location",()=>{
 assert.match(read("components/FanMobileTabs.tsx"),/key:"Artists"/);
 assert.match(read("lib/fanHeroConfig.ts"),/id:"artists"/);
 assert.match(read("components/ShellLayout.tsx"),/Explore artists/);
});
