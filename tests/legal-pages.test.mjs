import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("legal destinations are real public routes and linked from footer",()=>{
 const footer=read("components/PublicFooter.tsx");
 const sitemap=read("app/sitemap.ts");
 for(const path of ["/privacy","/terms","/copyright"]){
   assert.ok(footer.includes('href="'+path+'"'),path+" missing from footer");
   assert.ok(sitemap.includes('"'+path+'"'),path+" missing from sitemap");
   assert.match(read("app"+path+"/page.tsx"),/export default function/);
 }
});
test("signup terms and privacy notice are linked and checked on server",()=>{
 const signup=read("components/SignupForm.tsx");
 const action=read("app/signup/actions.ts");
 for(const path of ["/terms","/privacy","/copyright"])assert.ok(signup.includes('href="'+path+'"'));
 assert.match(signup,/name="accepted_terms" type="checkbox" required/);
 assert.match(action,/accepted_terms/);
 assert.match(action,/if \(!accepted\)/);
});
test("legal pages describe individual rights and rights to music separately",()=>{
 const privacy=read("app/privacy/page.tsx");
 const terms=read("app/terms/page.tsx");
 const copyright=read("app/copyright/page.tsx");
 assert.match(privacy,/odpc\.go\.ke/);
 assert.match(privacy,/Data Rights Request/);
 assert.match(privacy,/parent or guardian/);
 assert.match(copyright,/Copyright Claim/);
 assert.match(copyright,/does not, by itself, assign its copyright/);
 assert.match(terms,/separate decisions/);
 assert.match(terms,/not automatically a signed contract/);
});
test("contact and partnership requests explain personal data handling",()=>{
 assert.match(read("app/contact/page.tsx"),/href="\/privacy"/);
 assert.match(read("app/partner/page.tsx"),/href="\/privacy"/);
});
