import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("every hero editor location has an actual listening destination",()=>{
 const routes=read("components/HeroAdminPanel.tsx");
 for(const id of ["for-you","artists","albums","shows","billboard","library","following","recent","profile","inbox"])
  assert.match(routes,new RegExp('"'+id+'":"/(?:fan|billboard|messages)'));
});
test("published fan heroes render across listening tabs and public routes",()=>{
 const listener=read("components/ListenerExperience.tsx");
 const hero=read("components/ConfiguredFanHero.tsx");
 const billboard=read("app/billboard/page.tsx");
 const directory=read("app/creators/page.tsx");
 const profile=read("app/fan/profile/page.tsx");
 assert.match(listener,/hero\?<ConfiguredFanHero/);
 assert.match(listener,/tab==="Artists"[\s\S]*?ConfiguredFanHero/);
 for(const area of ["Albums & EPs","Shows","My Library","Following","Recently played"])
  assert.ok(listener.includes(area));
 assert.match(billboard,/heroSettings\.billboard\.enabled/);
 assert.match(billboard,/ConfiguredFanHero hero=\{customHero\}/);
 assert.match(directory,/heroSettings\.artists\.enabled/);
 assert.match(profile,/ConfiguredFanHero hero=\{hero\}/);
 assert.match(hero,/hero\.ctaHref/);
 assert.match(hero,/hero\.releaseId/);
 assert.match(hero,/fm-hero-.*hero\.layout/);
});
test("inactive custom heroes keep automatic content, and message heroes remain wired",()=>{
 assert.match(read("components/ListenerExperience.tsx"),/hero\?<ConfiguredFanHero[\s\S]*?:<StreamArtistHero/);
 assert.match(read("app/messages/page.tsx"),/heroes\.inbox\.enabled/);
 assert.match(read("app/admin/(control)/discovery/hero-actions.ts"),/revalidatePath\(path\)/);
});
