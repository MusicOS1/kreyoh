import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("session3 browser regression checks current premium Artist Home, not removed old recordings DOM",()=>{
 const browser=source("tests/browser/session3-recovery.mjs");
 const artist=source("components/ecosystem/ArtistHomePremium.tsx");
 assert.match(artist,/h1>Artist home<\/h1>/);
 assert.match(artist,/h2>Your insights<\/h2>/);
 assert.match(artist,/h2>Recent recordings<\/h2>/);
 assert.match(browser,/name:'Artist home'/);
 assert.match(browser,/name:'Recent recordings'/);
 assert.match(browser,/name:'Choose project tracks'/);
 assert.doesNotMatch(browser,/professional-track-/);
 assert.doesNotMatch(browser,/My professional recordings/);
});
