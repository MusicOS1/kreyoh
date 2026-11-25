import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("permanent FACKTS Music business is first on Finance Office dashboard",()=>{
 const dash=read("app/admin/(control)/finance/page.tsx");
 assert.match(dash,/FACKTS Music Finance/);
 assert.match(dash,/PERMANENT BUSINESS · FACKTS MUSIC/);
 assert.match(dash,/FACKTS money in/);
 assert.match(dash,/FACKTS money out/);
 assert.match(dash,/Operating expenses & bills/);
 assert.match(dash,/businessActivity=businessReady\?data\.bookEntries\.filter/);
 assert.match(dash,/e\.book_id===business!\.id/);
 assert.match(dash,/Managed-project activity/);
 assert.match(dash,/They are not FACKTS Music business revenue or expenses/);
 assert.match(dash,/FACKTS music/i);
});

test("Third Culture is an external temporary partner without auto-renewal or roster transfer",()=>{
 const config=read("lib/financeBackoffice.ts");
 const partner=read("app/finance-office/(portal)/partners/third-culture/page.tsx");
 const accounts=read("app/finance-office/(portal)/accounts/page.tsx");
 assert.match(config,/temporary_external_partner/);
 assert.match(config,/Temporary external partner engagement/);
 assert.match(partner,/Not a FACKTS Music subsidiary/);
 assert.match(partner,/no automatic renewal or new project/);
 assert.match(partner,/do not automatically move Third Culture members/i);
 assert.match(accounts,/EXTERNAL TEMPORARY PARTNER/);
 assert.match(accounts,/p\.id!==data\.TUKO_PROJECT_ID/);
 assert.match(accounts,/Creator-OWNED PROJECTS/i);
 assert.doesNotMatch(partner,/\.update\(\{owner_id|\.update\(\{artist_id/);
});

test("business income and expenses never depend on project aggregated totals",()=>{
 const dashboard=read("app/admin/(control)/finance/page.tsx");
 const platform=read("app/finance-office/(portal)/platform/page.tsx");
 assert.match(dashboard,/businessReady\?fmtKES\(bizIn\):"Not recorded"/);
 assert.match(dashboard,/businessReady\?fmtKES\(bizOut\):"Not recorded"/);
 assert.match(platform,/book_id===book!\.id/);
 assert.match(platform,/entry_type==="income"/);
 assert.match(platform,/entry_type==="expense"/);
 assert.match(platform,/e\.status==="draft"/);
 assert.match(platform,/Record money in or money out/);
 assert.match(platform,/recordFinanceBookEntry/);
 assert.match(platform,/postFinanceBookEntry/);
 assert.match(platform,/financeWritesEnabled\(\)/);
 assert.match(platform,/Third Culture member contributions/);
 assert.match(platform,/No operating records can be displayed/);
});

test("FACKTS Music has dedicated CSV export with authorization and no project cross-over",()=>{
 const route=read("app/finance-office/platform/export/route.ts");
 assert.match(route,/await requireControlRoomPermission\("finance"\)/);
 assert.match(route,/slug==="fackts_music_platform"/);
 assert.match(route,/e\.book_id===book\.id&&e\.status==="posted"/);
 assert.match(route,/Content-Disposition/);
 assert.match(route,/private, no-store/);
 assert.match(route,/status:409/);
 assert.doesNotMatch(route,/project_payment_invoices|project_membership_transactions/);
 const actions=read("app/admin/(control)/finance/actions.ts");
 assert.match(actions,/financeWritesEnabled\(\)/);
 assert.match(actions,/slug==="fackts_music_platform"/);
 assert.match(actions,/\/finance-office\/platform/);
});

test("existing bills, project reports, transactions, fan payments and artist studio routes are preserved",()=>{
 const nav=read("components/FinancePortalShell.tsx");
 for(const route of [
 "/finance-office/platform","/finance-office/accounts","/finance-office/partners/third-culture",
 "/finance-office/members","/finance-office/transactions","/finance-office/bills",
 "/finance-office/payments","/finance-office/fan-payments","/finance-office/reports"]){
  assert.ok(nav.includes(route),route);
 }
 assert.match(read("app/finance-office/(portal)/bills/page.tsx"),/recordProjectBill/);
 assert.match(read("app/finance-office/(portal)/transactions/page.tsx"),/Managed-project money in & out/);
 assert.match(read("app/finance-office/(portal)/reports/page.tsx"),/Managed-project reports/);
 assert.match(read("app/finance-office/(portal)/fan-payments/page.tsx"),/Fan payment points/);
 assert.match(read("components/ecosystem/ArtistHomePremium.tsx"),/ProjectTracksNavigator/);
 assert.match(read("components/ecosystem/EcosystemFrame.tsx"),/label: 'Finance'/);
});

test("new finance routes compile as TypeScript / JSX syntax",()=>{
 for(const path of [
  "lib/financeBackoffice.ts","lib/financeOfficeData.ts","components/FinancePortalShell.tsx",
  "app/admin/(control)/finance/page.tsx","app/admin/(control)/finance/actions.ts",
  "app/finance-office/(portal)/platform/page.tsx",
  "app/finance-office/(portal)/partners/third-culture/page.tsx",
  "app/finance-office/(portal)/accounts/page.tsx",
  "app/finance-office/(portal)/bills/page.tsx",
  "app/finance-office/(portal)/transactions/page.tsx",
  "app/finance-office/(portal)/reports/page.tsx",
  "app/finance-office/platform/export/route.ts"]){
   const content=read(path);
   const kind=path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS;
   const ast=ts.createSourceFile(path,content,ts.ScriptTarget.Latest,true,kind);
   assert.equal(ast.parseDiagnostics.length,0,path+": "+ast.parseDiagnostics.map(d=>d.messageText).join("; "));
 }
});
