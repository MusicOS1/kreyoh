import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const f=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const transpile=p=>ts.transpileModule(f(p),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const lib=await import("data:text/javascript;base64,"+Buffer.from(transpile("lib/financePaymentRequests.ts")).toString("base64"));
const valid={category:"platform_access",account:"fackts_music",projectId:"",recurrence:"one_time",
 description:"Platform user fee",amount:150,email:"",expiry:""};
const pId="11111111-1111-4111-8111-111111111111";

test("finance navigation tracks the URL instead of hardcoding Overview",()=>{
 const jsx=f("components/FinancePortalShell.tsx");
 const css=f("app/finance-office/portal.module.css");
 assert.match(jsx,/usePathname\(\)/);
 assert.match(jsx,/sectionFor\(pathname\)/);
 assert.match(jsx,/aria-current=\{selected===item.href\?"page":undefined\}/);
 assert.match(jsx,/onClick=\{toggleSidebar\}/);
 assert.match(jsx,/onClick=\{toggleMini\}/);
 assert.match(jsx,/aria-label="Expand Finance mini bar"/);
 assert.match(jsx,/aria-label="Collapse Finance mini bar"/);
 assert.match(jsx,/setMobileMenu\(false\)/);
 assert.doesNotMatch(css,/\.links a:first-child\{background:#20150e/);
 assert.match(css,/\.links a\.active/);
 assert.match(css,/\.mobileNav a\.active/);
 assert.match(css,/\.main\{min-width:0;max-width:100%;overflow-x:clip\}/);
 assert.match(f("app/finance-office/financeUi.module.css"),/\.tableWrap\{max-width:100%;min-width:0;overflow-x:auto/);
});

test("broad finance request catalog validates purpose and receiver boundaries",()=>{
 assert.ok(lib.FINANCE_REQUEST_TYPES.length>=10);
 for(const c of ["platform_access","artist_service","artist_onboarding","mix_mastering",
  "fan_membership","artist_support","release_support","sponsorship","licensing"])
  assert.ok(lib.requestCategory(c),c);
 assert.equal(lib.validateFinanceRequest(valid),null);
 assert.match(lib.validateFinanceRequest({...valid,category:"artist_support"}),/linked to the correct project/i);
 assert.equal(lib.validateFinanceRequest({...valid,category:"artist_support",account:"project",projectId:pId}),null);
 assert.match(lib.validateFinanceRequest({...valid,account:"project"}),/Choose the artist or project/);
 assert.match(lib.validateFinanceRequest({...valid,category:"artist_service",recurrence:"monthly"}),/Recurring charges are only/);
 assert.match(lib.validateFinanceRequest({...valid,account:"fackts_music",projectId:pId}),/must not be attached/);
 assert.match(lib.validateFinanceRequest({...valid,amount:0}),/fixed KES amount/);
 assert.match(lib.validateFinanceRequest({...valid,category:"unapproved"}),/approved reason/);
 assert.equal(lib.canOfferCheckout("approved","platform_access"),false);
 assert.equal(lib.canOfferCheckout("approved","fan_membership"),false);
});

test("finance requests are separate from legacy Paystack service invoices",()=>{
 const actions=f("app/finance-office/(portal)/payment-requests/actions.ts");
 const page=f("app/finance-office/(portal)/payment-requests/page.tsx");
 const schema=f("supabase/migrations/20261125053000_finance_payment_requests.sql");
 assert.match(actions,/await requireControlRoomPermission\("finance"\)/);
 assert.match(actions,/financeWritesEnabled\(\)/);
 assert.match(actions,/status:"draft",checkout_state:"not_configured"/);
 assert.doesNotMatch(actions,/initializePaystack|verifyAndRecordPaystack|project_payment_invoices/);
 assert.match(page,/FinancePaymentRequestForm/);
 assert.match(page,/Request register setup pending/);
 assert.match(schema,/enable row level security/);
 assert.match(schema,/revoke all on public\.finance_payment_requests from anon,authenticated/);
 assert.match(schema,/receiver_scope='project' and project_id is not null/);
 assert.match(schema,/checkout_state text not null default 'not_configured'/);
 const existing=f("lib/paystackPaymentPolicy.ts");
 assert.match(existing,/recording_session/);
 assert.match(existing,/production_service/);
});

test("public request page does not reveal payer email or enable payment",()=>{
 const page=f("app/payment-request/[token]/page.tsx");
 assert.match(page,/if\(!uuid\.test\(token\)\)notFound\(\)/);
 assert.match(page,/canOfferCheckout/);
 assert.match(page,/Payment not available yet/);
 assert.match(page,/No checkout, payment authorization/);
 assert.doesNotMatch(page,/payer_email|<PaymentCheckout|initializePaystack/);
});

test("new finance TypeScript files parse cleanly",()=>{
 for(const p of [
  "components/FinancePortalShell.tsx",
  "components/FinancePaymentRequestForm.tsx",
  "lib/financePaymentRequests.ts",
  "app/finance-office/(portal)/payment-requests/page.tsx",
  "app/finance-office/(portal)/payment-requests/actions.ts",
  "app/payment-request/[token]/page.tsx"
 ]){
  const ast=ts.createSourceFile(p,f(p),ts.ScriptTarget.Latest,true,p.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,p+": "+ast.parseDiagnostics.map(x=>x.messageText).join(" ; "));
 }
});
