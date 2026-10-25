import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("original FACKTS public homepage navigation is restored",()=>{
  const nav=read("components/PublicNavigationClient.tsx");
  for(const label of ["About","How It Works","Creators","Explore Music","Partners","Contact"]){
    assert.ok(nav.includes('["'+label+'",'),"Missing original navigation: "+label);
  }
  assert.doesNotMatch(nav,/fm-public-more/);
  assert.doesNotMatch(nav,/primaryLinks/);
  assert.match(nav,/href=\{identity\?"\/fan":"\/signup"\}/);
});
test("premium hero redesign styles do not overwrite original homepage",()=>{
  const layout=read("app/layout.tsx");
  assert.doesNotMatch(layout,/public-home-refinement\.css/);
  assert.match(layout,/import "\.\/legal\.css";/);
  const home=read("app/page.tsx");
  assert.match(home,/HomepageHero.module.css/);
  assert.match(home,/id="how-it-works"/);
  assert.match(home,/<PublicFooter/);
});
test("legal links remain despite reverting unrelated homepage styling",()=>{
  const footer=read("components/PublicFooter.tsx");
  for(const route of ["/privacy","/terms","/copyright"]){
    assert.ok(footer.includes('href="'+route+'"'),route+" must remain visible");
  }
  for(const route of ["privacy","terms","copyright"]){
    const page=read("app/"+route+"/page.tsx");
    assert.match(page,/LegalPageFrame/);
  }
});
