import {NextRequest,NextResponse} from "next/server";
import {TUKO_PROJECT_ID} from "../../../../../lib/financeBackoffice";
import {loadDetailedFinanceReport,reportPeriod,filteredReport,groupReport,reportTotals} from "../../../../../lib/detailedFinanceReport";
export const dynamic="force-dynamic";
const csv=(v:unknown)=>{const s=String(v??"").replace(/[\r\n\t]+/g," ").trim();return '"'+(/^[=+@\-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
export async function GET(req:NextRequest){
 const p=req.nextUrl.searchParams,project=p.get("project")||TUKO_PROJECT_ID;
 const data=await loadDetailedFinanceReport(project);
 if(!data)return new NextResponse("Project not found",{status:404});
 const range=reportPeriod(p.get("period")||undefined,p.get("from")||undefined,p.get("to")||undefined);
 if(range.invalid)return new NextResponse("Invalid custom date range",{status:400});
 const rows=filteredReport(data.rows,range,p.get("q")||"");
 const lines:unknown[][]=[["Month","Ledger date","Transaction ID","Internal ID","Payer / payee","Provider / payment reference","Method","Purpose","Ledger","Direction","Currency","Amount","Status","Posted ledger total","Reconciliation note"]];
 for(const [month,items] of groupReport(rows)){
  for(const r of items)lines.push([month,r.date,r.code,r.id,r.party,r.reference,r.method,r.purpose,r.ledger,r.kind,r.currency,r.amount.toFixed(2),r.status,r.counted?"Yes":"No",r.warning]);
  for(const ledger of ["Project","Partner operating book"]){if(!items.some(r=>r.ledger===ledger))continue;const t=reportTotals(items,ledger);lines.push([month,"","","","","","","Monthly posted income",ledger,"income","KES",(t.income/100).toFixed(2)], [month,"","","","","","","Monthly paid expenses",ledger,"expense","KES",(t.expense/100).toFixed(2)]);}
 }
 for(const ledger of ["Project","Partner operating book"]){if(ledger!=="Project"&&!rows.some(r=>r.ledger===ledger))continue;const t=reportTotals(rows,ledger);lines.push(["TOTAL","","","","","","","Posted income",ledger,"income","KES",(t.income/100).toFixed(2)],["TOTAL","","","","","","","Paid expenses",ledger,"expense","KES",(t.expense/100).toFixed(2)]);}
 if(!data.bookAvailable)lines.push(["NOTE","","","","","","","Partner operating book unavailable"]);
 const content="\ufeff"+lines.map(row=>row.map(csv).join(",")).join("\r\n")+"\r\n";
 return new NextResponse(content,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="ProjectFinanceReport.csv"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
