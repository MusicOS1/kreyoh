import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("creator professions are accessible compact checkboxes and existing values are retained",()=>{
 const page=get("app/admin/(control)/users/[userId]/page.tsx");
 const css=get("app/admin/control-room.css");
 assert.match(page,/<fieldset className="control-creator-types">/);
 assert.match(page,/<legend>Creative disciplines<\/legend>/);
 assert.match(page,/name="creator_types" value=\{type\} defaultChecked=\{\(user.creator_types\|\|\[\]\).includes\(type\)\}/);
 assert.match(css,/\.control-creator-types-grid input\[type="checkbox"\]/);
 assert.match(css,/width:18px!important/);
 assert.match(css,/flex-direction:row/);
 assert.match(css,/@media\(max-width:680px\).*grid-template-columns:1fr/);
});
test("menus and global top navigation avoid low contrast lettering",()=>{
 const css=get("app/admin/control-room.css");
 const header=get("components/ecosystem/GlobalHeader.module.css");
 const workspace=get("components/ecosystem/EcosystemFrame.module.css");
 assert.match(css,/\.control-room \.control-nav-group>a\{color:#372f28/);
 assert.match(header,/font-weight: 600;\n  color: #ebe8ee;/);
 assert.match(workspace,/color: #ebe5ee/);
});

test("platform administrator grant cards have readable light surfaces and clear controls",()=>{
 const css=get("app/admin/control-room.css");
 const scoped=css.slice(css.indexOf("/* Admin access legibility:"));
 assert.match(scoped,/background: #fffaf0;/);
 assert.match(scoped,/color: #211b15;/);
 assert.match(scoped,/font-size: 16px;/);
 assert.match(scoped,/font-size: 14px;/);
 assert.match(scoped,/background: #992f28 !important;/);
 assert.match(scoped,/color: #fffaf5 !important;/);
 assert.match(scoped,/\.control-permission-checks input\[type="checkbox"\]/);
 assert.match(scoped,/color-scheme: light;/);
 assert.match(scoped,/@media \(max-width: 760px\)/);
});
