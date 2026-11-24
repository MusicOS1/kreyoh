import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("artist navigation exposes Finance and Payments separate from sessions",()=>{
 const links=read("lib/workspaceExperience.ts"),bottom=read("components/ecosystem/EcosystemFrame.tsx");
 assert.match(links,/\['Finance & earnings', '\/finance'\]/);
 assert.match(links,/\['Payments & links', '\/payments'\]/);
 assert.match(bottom,/label: 'Finance', href: '\/finance'/);
 assert.match(bottom,/label: 'Payments', href: '\/payments'/);
 assert.match(read("components/ecosystem/ArtistHomePremium.tsx"),/Finance & earnings/);
});

test("finance uses its existing ledger and distinguishes project income from earnings",()=>{
 const source=read("app/finance/page.tsx"),panel=read("components/FinanceJourneyPanel.tsx");
 assert.match(source,/FinanceJourneyPanel/);
 assert.match(source,/MembershipPaymentForm/);
 assert.match(source,/project_membership_transactions/);
 assert.match(panel,/Not tracked yet/);
 assert.match(panel,/not automatically the artist's earnings/);
 assert.match(panel,/Review recorded split proposals/);
});

test("non-admin payments screen provides project guidance, not arbitrary invoice creation",()=>{
 const page=read("app/payments/page.tsx"),action=read("app/payments/actions.ts");
 assert.match(page,/if\(!canEditProjectFinance\(roles\)\)/);
 assert.match(page,/Message your project team/);
 assert.match(action,/if\(!project\|\|!canEditProjectFinance\(roles\)\)/);
 assert.match(page,/row\.public_token===created&&row\.created_by===user\.id/);
 assert.match(page,/row\.status==="open"\?<PaymentLinkCopy/);
});

test("public release support uses existing social actions and creates no unapproved charge",()=>{
 const release=read("app/billboard/[releaseId]/page.tsx");
 const submit=read("app/billboard/submit/page.tsx");
 assert.match(release,/Support \{r\.artist_name\}/);
 assert.match(release,/Direct paid artist support is not available/);
 assert.match(submit,/Paid fan support is not enabled/);
 assert.match(submit,/Open release & share/);
 assert.match(release,/<ReleaseAudienceActions/);
 assert.doesNotMatch(release,/<PaymentCheckout|createPaymentInvoice/);
});

test("finance changes parse cleanly and preserve server-side verification route",()=>{
 for(const path of ["lib/workspaceExperience.ts","components/ecosystem/EcosystemFrame.tsx","components/ecosystem/ArtistHomePremium.tsx","app/finance/page.tsx","app/payments/page.tsx","app/billboard/submit/page.tsx","app/billboard/[releaseId]/page.tsx","components/FinanceJourneyPanel.tsx"]){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,path+":"+source.parseDiagnostics.map(d=>d.messageText).join(";"));
 }
 const route=read("app/api/payments/verify/route.ts");
 assert.match(route,/verifyAndRecordPaystack/);
});
