import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Finance distinguishes uncreated operating ledgers from empty bank balances",()=>{
 const accounts=read("app/finance-office/(portal)/accounts/page.tsx");
 const book=read("app/admin/(control)/finance/books/[slug]/page.tsx");
 assert.match(accounts,/Setup pending/);
 assert.match(accounts,/This does not mean the organisation has no money/);
 assert.match(book,/This does not mean the organisation has no money/);
 assert.doesNotMatch(accounts,/>Not activated</);
});
test("Third Culture members render complete mobile cards and clear missing record wording",()=>{
 const members=read("app/finance-office/(portal)/members/page.tsx");
 const css=read("app/finance-office/financeUi.module.css");
 assert.match(members,/mobileMemberList/);
 assert.match(members,/mobileMemberCard/);
 assert.match(members,/Record missing/);
 assert.match(members,/not an unpaid bill or a blocked login/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/\.memberDesktopTable\{display:none\}/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(members,/href=\{"\/finance-office\/members\/"\+m.userId\}/);
});
test("Finance portal has separate Fan Payments, never reclassifies studio invoices",()=>{
 const nav=read("components/FinancePortalShell.tsx");
 const financial=read("app/finance-office/(portal)/fan-payments/page.tsx");
 const payments=read("app/finance-office/(portal)/payments/page.tsx");
 assert.match(nav,/title:"Fan payments",href:"\/finance-office\/fan-payments"/);
 assert.match(payments,/href="\/finance-office\/fan-payments"/);
 assert.match(financial,/await requireControlRoomPermission\("finance"\)/);
 assert.match(financial,/No dedicated verified fan-payment ledger/);
 assert.match(financial,/0 live/);
 assert.match(financial,/Approved prices and purposes/);
 assert.doesNotMatch(financial,/PaystackCheckout|createPaymentInvoice|createCentralServiceInvoice/);
});
test("Artist, release and public fan support explain payment points without enabling charges",()=>{
 const publicPoint=read("components/FanPaymentPoint.tsx");
 const artist=read("app/creators/[userId]/page.tsx");
 const release=read("app/billboard/[releaseId]/page.tsx");
 const fanPage=read("app/fan-support/page.tsx");
 assert.match(publicPoint,/Pay to support · not available yet/);
 assert.match(publicPoint,/href="\/fan-support"/);
 assert.match(publicPoint,/aria-disabled="true"/);
 assert.match(artist,/<FanPaymentPoint artistName=\{name\}/);
 assert.match(release,/<FanPaymentPoint artistName=\{r.artist_name\} kind="release"\/>/);
 assert.match(fanPage,/No fan charges are currently enabled/);
 assert.doesNotMatch(fanPage,/createPaymentInvoice|PaymentCheckout|signInWithPassword/);
});
test("All new TS/TSX files parse cleanly",()=>{
 for(const p of ["app/finance-office/(portal)/fan-payments/page.tsx","app/fan-support/page.tsx",
  "components/FanPaymentPoint.tsx","components/FinancePortalShell.tsx",
  "app/finance-office/(portal)/members/page.tsx","app/creators/[userId]/page.tsx",
  "app/billboard/[releaseId]/page.tsx","app/finance-office/(portal)/accounts/page.tsx"]){
  const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0,p+": "+ast.parseDiagnostics.map(d=>d.messageText).join(";"));
 }
});
