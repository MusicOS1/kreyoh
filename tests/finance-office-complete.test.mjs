import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const route=p=>"app/finance-office/(portal)/"+p+"/page.tsx";
test("Finance Office sections are complete and separate from artist workspace",()=>{
 const shell=file("components/FinancePortalShell.tsx");
 for(const path of ["/finance-office/accounts","/finance-office/members","/finance-office/transactions",
  "/finance-office/payments","/finance-office/bills","/finance-office/reports"])
  assert.match(shell,new RegExp(path.replaceAll("/","\\/")));
 for(const page of ["accounts","members","transactions","payments","bills","reports"])
  assert.ok(file(route(page)).includes("Finance"),page);
 assert.doesNotMatch(shell,/studio-sessions|workspaces\/artist/);
});
test("Finance Office reuses actual separate project ledgers, excludes unverified income",()=>{
 const loader=file("lib/financeOfficeData.ts");
 assert.match(loader,/project_membership_transactions/);
 assert.match(loader,/project_expenses/);
 assert.match(loader,/project_payment_invoices/);
 assert.match(loader,/isMemberRevenue/);
 assert.match(loader,/r\.payment_status==="paid"/);
 assert.match(loader,/m\.status==="posted"/);
 assert.match(loader,/e\.payment_status==="paid"/);
 assert.match(file(route("reports")) ,/periodStart/);
 assert.doesNotMatch(file(route("reports")) ,/Math\.random\(/);
});
test("Third Culture member accounts show posted amounts, not fabricated arrears",()=>{
 const helper=file("lib/thirdCultureFinance.ts");
 assert.match(helper,/requireControlRoomPermission\("finance"\)/);
 assert.match(helper,/TUKO_PROJECT_ID/);
 assert.match(helper,/t\.status==="posted"/);
 const member=file(route("members/[userId]"));
 assert.match(member,/Not set/);
 assert.match(member,/not the member's bank account/);
 assert.match(member,/recordMemberContribution/);
 const actions=file("app/finance-office/(portal)/actions.ts");
 assert.match(actions,/createThirdCultureMemberAccount/);
 assert.match(actions,/recordMemberContribution/);
 assert.match(actions,/requirePosting\(\)/);
 assert.match(actions,/proof_checked/);
 assert.match(actions,/payment_reference/);
});
test("Bills are committed before payment and require a real receipt reference",()=>{
 const page=file(route("bills"));
 const actions=file("app/finance-office/(portal)/actions.ts");
 assert.match(page,/Bills awaiting payment/);
 assert.match(page,/recordProjectBill/);
 assert.match(page,/confirmProjectBillPaid/);
 assert.match(actions,/payment_status:"committed"/);
 assert.match(actions,/payment_status:"paid"/);
 assert.match(actions,/receipt_reference/);
 assert.match(actions,/payment_confirmed/);
 assert.match(actions,/await requireControlRoomPermission\("finance"\)/);
});
test("Reports CSV is permission checked, no-store and spreadsheet injection safe",()=>{
 const route=file("app/finance-office/reports/export/route.ts");
 assert.match(route,/requireControlRoomPermission\("finance"\)/);
 assert.match(route,/Cache-Control.*private, no-store/);
 assert.match(route,/Content-Disposition/);
 assert.match(route,/replaceAll\('"'/);
});
test("Finance screens all parse cleanly",()=>{
 for(const p of [
  "lib/financeOfficeData.ts","lib/thirdCultureFinance.ts","components/FinancePortalShell.tsx",
  "components/FinanceTrend.tsx","app/admin/(control)/finance/page.tsx",
  "app/finance-office/(portal)/actions.ts",
  "app/finance-office/reports/export/route.ts",
  ...["accounts","members","members/[userId]","transactions","payments","bills","reports"].map(route)]){
  const parsed=ts.createSourceFile(p,file(p),ts.ScriptTarget.Latest,true,p.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0,p+": "+parsed.parseDiagnostics.map(d=>d.messageText).join("; "));
 }
});
