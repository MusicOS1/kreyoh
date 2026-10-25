import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
test("professional review is on explicit cream Control Room theme",()=>{
 const page=read("app/admin/(control)/professional-applications/page.tsx");
 const css=read("app/admin/control-room.css");
 assert.match(page,/className="control-professional-review"/);
 assert.doesNotMatch(page,/className="content professional-review"/);
 assert.match(css,/\.control-room \.control-admin-page-header h1/);
 assert.match(css,/color:#1b1712/);
});
test("admin shell width constrained and mobile drawer retained",()=>{
 const css=read("app/admin/control-room.css");
 assert.match(css,/\.control-room \.control-shell\{width:100%;min-width:0;max-width:100%/);
 assert.match(css,/\.control-room \.control-content\{min-width:0;max-width:100%;overflow-x:clip\}/);
 assert.match(css,/\.control-room \.control-sidebar\{position:fixed;left:0\}/);
});
