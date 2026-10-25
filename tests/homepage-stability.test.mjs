import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("homepage uses scoped components without changing the shared default header",()=>{
 const homepage=read("app/page.tsx"),root=read("app/layout.tsx"),nav=read("components/PublicNavigation.tsx");
 assert.match(homepage,/<PublicNavigation homepage/);
 assert.match(homepage,/HomepageHero.module.css/);
 assert.doesNotMatch(root,/HomepageHero|HomepageNavigation|homepage-stability/);
 assert.match(nav,/homepage=false/);
 assert.match(nav,/<PublicNavigationClient identity=/);
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
test("footer legal links remain untouched",()=>{
 const footer=read("components/PublicFooter.tsx");
 for(const route of ["/privacy","/terms","/copyright"])assert.ok(footer.includes('href="'+route+'"'),route);
});
