import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("session 3 browser selectors match the current ProjectContext",()=>{
 const app=read("components/ecosystem/ProjectContext.tsx");
 const browser=read("tests/browser/session3-recovery.mjs");
 assert.match(app,/aria-label="Current project"/);
 assert.match(app,/>Switch project<\/label>/);
 assert.match(app,/>Open selected project<\/button>/);
 assert.match(browser,/getByRole\('region',\{name:'Current project'\}\)/);
 assert.match(browser,/getByLabel\('Switch project',\{exact:true\}\)/);
 assert.doesNotMatch(browser,/const changer=region\.locator\('details'\)/);
});
