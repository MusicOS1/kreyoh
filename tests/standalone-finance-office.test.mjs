import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Finance Office is a standalone route, not a project or Control Room layout",()=>{
 const layout=file("app/finance-office/(portal)/layout.tsx");
 assert.match(layout,/getFinancePortalAccess/);
 assert.match(layout,/if\(!access\.user\)redirect\("\/finance-office\/login"\)/);
 assert.match(layout,/if\(!access\.authorised\)redirect\("\/finance-office\/access-unavailable"\)/);
 assert.match(layout,/<FinancePortalShell/);
 assert.doesNotMatch(layout,/ControlRoomShell|AppShell|GlobalHeader/);
 const shell=file("components/FinancePortalShell.tsx");
 assert.match(shell,/Finance Office/);
 assert.match(shell,/Finance portal mobile navigation/);
 assert.doesNotMatch(shell,/studio-sessions|artist-workspace/);
 assert.match(file("app/finance-office/(portal)/page.tsx"),/admin\/\(control\)\/finance\/page/);
});

test("Finance login uses existing Supabase user identity and explicit finance grant",()=>{
 const access=file("lib/financePortalAccess.ts");
 const login=file("app/finance-office/login/actions.ts");
 assert.match(access,/supabase\.auth\.getUser\(\)/);
 assert.match(access,/getControlRoomPermissions/);
 assert.match(access,/permissions\.includes\("finance"\)\|\|permissions\.includes\("all"\)/);
 assert.match(login,/supabase\.auth\.signInWithPassword/);
 assert.match(login,/hasControlRoomPermission\(id,"finance"\)/);
 assert.match(login,/redirect\("\/finance-office\/access-unavailable"\)/);
 assert.doesNotMatch(login,/control_room_admins"\)\.upsert|update.*permissions/);
 assert.match(file("app/finance-office/login/page.tsx"),/financeOfficeLogin/);
 assert.match(file("app/finance-office/access-unavailable/page.tsx"),/Finance access required/);
});

test("Control Room Finance link and finance-only default route go to new office",()=>{
 const shell=file("components/ControlRoomShell.tsx");
 assert.match(shell,/href: "\/finance-office".*permission: "finance"/);
 const overview=file("app/admin/(control)/page.tsx");
 assert.match(overview,/permissions\.length===1&&permissions\[0\]==="finance"\)redirect\("\/finance-office"\)/);
 assert.match(file("app/admin/login/page.tsx"),/href="\/finance-office\/login"/);
});

test("Operating account, project account and finance action routes stay within Finance Office",()=>{
 for(const p of [
  "app/admin/(control)/finance/page.tsx",
  "app/admin/(control)/finance/books/[slug]/page.tsx",
  "app/admin/(control)/finance/projects/[projectId]/page.tsx",
  "app/admin/(control)/finance/actions.ts"]){
   const source=file(p);
   assert.match(source,/\/finance-office/);
   assert.doesNotMatch(source,/\/admin\/finance/);
 }
 const book=file("app/finance-office/(portal)/books/[slug]/page.tsx");
 const project=file("app/finance-office/(portal)/projects/[projectId]/page.tsx");
 assert.match(book,/admin\/\(control\)\/finance\/books/);
 assert.match(project,/admin\/\(control\)\/finance\/projects/);
 assert.match(file("app/admin/(control)/finance/actions.ts"),/requireWriteActivation\(\)/);
});

test("Finance Office allows safe signout back to its own login; contrast is readable",()=>{
 const signout=file("app/auth/signout/route.ts");
 assert.match(signout,/next === "\/finance-office\/login"/);
 assert.match(file("components/FinancePortalShell.tsx"),/auth\/signout\?next=\/finance-office\/login/);
 const css=file("app/finance-office/portal.module.css");
 assert.match(css,/\.mobileNav/);
 assert.match(css,/color:#f5f5f5/);
 assert.match(file("app/admin/(control)/finance/finance.module.css"),/\.root p,.sectionHead p\{color:#e4e4e8\}/);
});

test("Standalone finance TypeScript and TSX routes parse",()=>{
 for(const p of [
  "lib/financePortalAccess.ts",
  "components/FinancePortalShell.tsx",
  "app/finance-office/(portal)/layout.tsx",
  "app/finance-office/(portal)/page.tsx",
  "app/finance-office/(portal)/books/[slug]/page.tsx",
  "app/finance-office/(portal)/projects/[projectId]/page.tsx",
  "app/finance-office/login/page.tsx",
  "app/finance-office/login/actions.ts",
  "app/finance-office/access-unavailable/page.tsx",
  "app/auth/signout/route.ts",
  "app/admin/(control)/page.tsx"
 ]){
  const parse=ts.createSourceFile(p,file(p),ts.ScriptTarget.Latest,true,p.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parse.parseDiagnostics.length,0,p+": "+parse.parseDiagnostics.map(d=>d.messageText).join(" / "));
 }
});