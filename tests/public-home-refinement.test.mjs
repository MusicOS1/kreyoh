import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
test("public landing page remains separate from authenticated discovery",()=>{
 const home=get("app/page.tsx");
 assert.match(home,/className="public-site fm-v3-site"/);
 assert.match(home,/id="how-it-works"/);
 assert.match(home,/<PublicFooter/);
 assert.match(home,/href="\/listen"/);
});
test("public navigation is simplified but retains every informational destination",()=>{
 const nav=get("components/PublicNavigationClient.tsx");
 for(const link of ["/about","/#how-it-works","/creators","/listen","/partner","/contact","/home","/fan","/signup","/login"]){
  assert.ok(nav.includes('"'+link+'"'),link+" navigation destination missing");
 }
 assert.match(nav,/className="fm-public-more"/);
 assert.match(nav,/aria-controls="fm-public-mobile-menu"/);
 assert.match(nav,/aria-expanded=\{open\}/);
 assert.match(nav,/inert=\{!open\}/);
});
test("last-loaded homepage CSS bounds text width and hides desktop links on tablets",()=>{
 const css=get("app/public-home-refinement.css");
 const layout=get("app/layout.tsx");
 assert.ok(layout.indexOf('import "./public-home-refinement.css";')>layout.indexOf('import "./music-ecosystem.css";'));
 assert.match(css,/grid-template-columns:minmax\(0,1.04fr\) minmax\(0,.96fr\)/);
 assert.match(css,/font-size:clamp\(43px,5vw,76px\)/);
 assert.match(css,/@media\(max-width:940px\)/);
 assert.match(css,/\.fm-public-nav-links\{display:none\}/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/\.fm-v3-hero-copy h1 em/);
});
