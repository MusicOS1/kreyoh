import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("homepage CSS is scoped to the homepage, not app/layout or other routes",()=>{
 const homepage=read("app/page.tsx");
 const root=read("app/layout.tsx");
 const css=read("app/homepage-stability.css");
 assert.match(homepage,/import "\.\/homepage-stability\.css";/);
 assert.doesNotMatch(root,/homepage-stability\.css/);
 assert.ok(css.includes(".fm-v3-site .fm-v3-hero-copy h1"));
 assert.ok(css.includes(".fm-v3-site .fm-public-nav"));
 assert.doesNotMatch(css,/^\s*(body|html|\.fm-public-nav|\.fm-v3-hero-copy)\s*[{,]/m);
});
test("original copy, creative images and original nav links remain intact",()=>{
 const home=read("app/page.tsx");
 const nav=read("components/PublicNavigationClient.tsx");
 assert.match(home,/Discover music\./);
 assert.match(home,/Find your people\./);
 assert.match(home,/Be part of it\./);
 assert.match(home,/fackts-creative-community\.jpg/);
 for(const link of ["About","How It Works","Creators","Explore Music","Partners","Contact"]){
  assert.ok(nav.includes('["'+link+'",'),link);
 }
});
test("headline is bounded, and navigation collapses before overflowing",()=>{
 const css=read("app/homepage-stability.css");
 assert.match(css,/font-size: clamp\(43px, 4\.3vw, 65px\)/);
 assert.match(css,/grid-template-columns: minmax\(0, 1\.08fr\) minmax\(0, \.92fr\)/);
 assert.match(css,/@media \(min-width: 941px\) and \(max-width: 1690px\)/);
 assert.match(css,/@media \(max-width: 940px\)/);
 assert.match(css,/\.public-mobile-menu\.is-open/);
 assert.match(css,/@media \(max-width: 600px\)/);
});
test("footer legal links remain untouched",()=>{
 const footer=read("components/PublicFooter.tsx");
 for(const route of ["/privacy","/terms","/copyright"])assert.ok(footer.includes('href="'+route+'"'),route);
});
