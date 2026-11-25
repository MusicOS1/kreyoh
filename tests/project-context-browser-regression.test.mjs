import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Session 3 selection uses the visible My Projects card and checks its cookie",()=>{
 const projects=read("app/projects/page.tsx");
 const browser=read("tests/browser/session3-recovery.mjs");
 assert.match(projects,/className="panel project-discovery-card my-project-card"/);
 assert.match(projects,/action=\{selectProject\}/);
 assert.match(projects,/>Enter project<\/button>/);
 assert.match(browser,/getByRole\('button',\{name:'Enter project',exact:true\}\)/);
 assert.match(browser,/fackts_project_id/);
 assert.match(browser,/getByRole\('region',\{name:'Selected project'\}\)/);
 assert.doesNotMatch(browser,/getByLabel\('Switch project',\{exact:true\}\)/);
});
