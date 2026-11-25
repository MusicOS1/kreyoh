import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const model=read("lib/financeBackoffice.ts");
const js=ts.transpileModule(model,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const finance=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
const projectA="11111111-1111-4111-8111-111111111111",projectB="22222222-2222-4222-8222-222222222222";

test("project recorded totals never blend project or platform money or count expected receipts",()=>{
 const p=[{id:projectA,name:"Project A"},{id:projectB,name:"Project B"}];
 const commercial=[{project_id:projectA,amount:1500,currency:"KES",payment_status:"paid",revenue_source:"Paystack · recording session"},
  {project_id:projectA,amount:2000,currency:"KES",payment_status:"expected",revenue_source:"Expected booking"},
  {project_id:projectA,amount:9999,currency:"KES",payment_status:"paid",revenue_source:"Membership Fees"},
  {project_id:projectB,amount:400,currency:"USD",payment_status:"paid",revenue_source:"Service"}];
 const membership=[{project_id:projectA,amount:500,currency:"KES",status:"posted"},
 {project_id:projectA,amount:400,currency:"KES",status:"reversed"},
 {project_id:projectB,amount:200,currency:"KES",status:"posted"}];
 const expenses=[{project_id:projectA,amount:600,currency:"KES",payment_status:"paid"},
 {project_id:projectA,amount:200,currency:"KES",payment_status:"committed"},
 {project_id:projectB,amount:30,currency:"KES",payment_status:"paid"}];
 const sums=finance.summariseProjects(p,commercial,membership,expenses);
 assert.deepEqual(sums.get(projectA),{received:2000,spent:600,net:1400,membership:500,commercial:1500});
 assert.deepEqual(sums.get(projectB),{received:200,spent:30,net:170,membership:200,commercial:0});
 assert.equal(sums.size,2);
});

test("operating draft entries are excluded and finance writes stay inactive without production approval",()=>{
 const totals=finance.recordedBookTotals([{book_id:"fackts",entry_type:"income",amount_kes:100,status:"draft"},
 {book_id:"culture",entry_type:"income",amount_kes:800,status:"posted"},
 {book_id:"culture",entry_type:"expense",amount_kes:200,status:"posted"}]);
 assert.equal(totals.has("fackts"),false);
 assert.deepEqual(totals.get("culture"),{income:800,expense:200});
 assert.match(model,/FINANCE_BACKOFFICE_WRITES_ENABLED/);
 assert.match(model,/process\.env\.VERCEL_ENV==="production"/);
});

test("all finance pages and actions demand explicit central finance permission",()=>{
 for(const path of [
  "app/admin/(control)/finance/page.tsx",
  "app/admin/(control)/finance/books/[slug]/page.tsx",
  "app/admin/(control)/finance/projects/[projectId]/page.tsx",
  "app/admin/(control)/finance/actions.ts"])
 assert.match(read(path),/await requireControlRoomPermission\("finance"\)/,path);
 assert.match(read("app/admin/(control)/finance/actions.ts"),/requireWriteActivation\(\)/);
 assert.match(read("app/admin/(control)/finance/actions.ts"),/isPurposeAllowedForPaymentMode/);
});

test("team role presets are not super-admin grants and sales is separate from finance",()=>{
 const grant=read("components/AdminGrantAccessForm.tsx");
 assert.match(grant,/Finance leader/);assert.match(grant,/Sales & partnerships/);assert.match(grant,/Music operations admin/);
 assert.doesNotMatch(grant,/keys:\["all"\]/);
 assert.match(read("app/admin/(control)/sales/page.tsx"),/requireControlRoomPermission\("commercial"\)/);
 assert.match(read("components/ControlRoomShell.tsx"),/permission: "finance"/);
 assert.match(read("components/ControlRoomShell.tsx"),/permission: "commercial"/);
});

test("finance books are separate from project ownership and not browser-readable",()=>{
 const sql=read("supabase/migrations/20261124053000_finance_backoffice_accounts.sql");
 assert.match(sql,/finance_books/);assert.match(sql,/finance_book_project_links/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.finance_books/);
 assert.doesNotMatch(sql,/update\s+public\.projects|set\s+owner_id/i);
});

test("direct privileged routes enforce the corresponding Control Room permission",()=>{
 for(const [route,permission] of [["app/admin/(control)/users/[userId]/page.tsx","people"],["app/admin/(control)/system/page.tsx","system"],["app/admin/(control)/analytics/page.tsx","intelligence"],["app/admin/(control)/operations/page.tsx","music"],["app/admin/(control)/enquiries/page.tsx","enquiries"],["app/admin/(control)/activity/page.tsx","intelligence"],["app/admin/(control)/diagnostics/page.tsx","system"],["app/admin/(control)/suggestions/page.tsx","projects"],["app/admin/(control)/voting/page.tsx","intelligence"]]){
 assert.match(read(route),new RegExp('await requireControlRoomPermission\\("'+permission+'"\\)'),route);
 }
});

test("finance back office TS and JSX parse cleanly",()=>{
 for(const path of ["components/ControlRoomShell.tsx","app/admin/(control)/sales/page.tsx","app/admin/(control)/users/[userId]/page.tsx","app/admin/(control)/system/page.tsx","app/admin/(control)/analytics/page.tsx","app/admin/(control)/operations/page.tsx","app/admin/(control)/enquiries/page.tsx","app/admin/(control)/activity/page.tsx","app/admin/(control)/diagnostics/page.tsx","app/admin/(control)/suggestions/page.tsx","app/admin/(control)/voting/page.tsx","lib/financeBackoffice.ts","app/admin/(control)/finance/page.tsx","app/admin/(control)/finance/books/[slug]/page.tsx","app/admin/(control)/finance/projects/[projectId]/page.tsx","app/admin/(control)/finance/actions.ts"]){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length,0,path+":"+source.parseDiagnostics.map(d=>d.messageText).join(";"));
 }
});
