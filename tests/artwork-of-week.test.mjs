import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Artwork of the Week components parse without TS or JSX syntax errors",()=>{
 for(const path of [
  "lib/fanHeroConfig.ts","lib/artworkOfWeek.ts","components/ArtworkOfTheWeek.tsx",
  "components/HeroAdminPanel.tsx","components/ListenerExperience.tsx",
  "app/fan/profile/page.tsx"
 ]){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,
   path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(x=>x.messageText),[],path);
 }
});
test("published promo is a standalone Discover feature, not a fan profile editor banner",()=>{
 const config=read("lib/fanHeroConfig.ts");
 const fan=read("components/ListenerExperience.tsx");
 const profile=read("app/fan/profile/page.tsx");
 const admin=read("components/HeroAdminPanel.tsx");
 assert.match(config,/id:"artwork",label:"Artwork of the Week"/);
 assert.match(fan,/artworkOfWeek&&<ArtworkOfTheWeek feature=\{artworkOfWeek\}/);
 assert.match(profile,/!isMisplacedArtworkHero\(heroes\.profile\)/);
 assert.match(admin,/artwork:artworkOfWeekSetting\(configs,artwork\)/);
 assert.match(admin,/"artwork":"\/fan\?tab=For%20You"/);
});
test("legacy wrongly placed artwork resolves from a uniquely matched published release and never shows a generic placeholder",()=>{
 const fn=read("lib/artworkOfWeek.ts");
 const card=read("components/ArtworkOfTheWeek.tsx");
 assert.match(fn,/isMisplacedArtworkHero/);
 assert.match(fn,/candidates\.length===1/);
 assert.match(fn,/has_cover/);
 assert.match(fn,/if\(!artwork\)return null/);
 assert.match(fn,/\/api\/releases\//);
 assert.match(card,/fm-artwork-week-cover/);
 assert.match(card,/fm-artwork-week-card/);
 assert.match(card,/release\?\.artist_name/);
});

test("Discover features share a responsive editorial zone, without burying playback or the music feed",()=>{
 const fan=read("components/ListenerExperience.tsx");
 const card=read("components/ArtworkOfTheWeek.tsx");
 const stylesheet=read("components/streaming/streaming.css");
 const index=fan.indexOf('tab==="For You"');
 const browse=fan.slice(index,fan.indexOf('tab==="Artists"',index));
 assert.match(browse,/fm-discover-feature-zone/);
 assert.match(browse,/fm-discover-artist-feature/);
 assert.match(browse,/artworkOfWeek&&<ArtworkOfTheWeek/);
 assert.ok(browse.indexOf("fm-discover-artist-feature")<browse.indexOf("ArtworkOfTheWeek"));
 assert.ok(browse.indexOf("ArtworkOfTheWeek")<browse.indexOf("Pick up where you left off"));
 for(const control of ["onPlay={id=>playSong(id)}","onFollow={id=>void change","onOpen={openArtist}"])
  assert.ok(browse.includes(control),"Artist action missing: "+control);
 assert.match(card,/release\?\.title\|\|entry\.eyebrow/);
 assert.match(stylesheet,/grid-template-columns:minmax\(0,1\.65fr\) minmax\(0,1fr\)/);
 assert.match(stylesheet,/@media\(max-width:1110px\)/);
 assert.match(stylesheet,/\.fm-discover-feature-zone \.fm-artwork-week-card/);
});
