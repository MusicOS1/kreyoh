import {NextRequest,NextResponse} from "next/server";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {loadFinanceOfficeData,periodStart} from "../../../../lib/financeOfficeData";
export const dynamic="force-dynamic";
const sanitize=(v:unknown)=>{const plain=String(v??"").replace(/[\r\n\t]+/g," ").trim();const safe=/^[=+@\-]/.test(plain)?"'"+plain:plain;return '"'+safe.replaceAll('"','""')+'"';};
export async function GET(request:NextRequest){
 await requireControlRoomPermission("finance");
 const p=request.nextUrl.searchParams.get("period")||"30";
 const period=["30","90","365","all"].includes(p)?p:"30";
 const from=period==="all"?"":periodStart(period).toISOString().slice(0,10);
 const data=await loadFinanceOfficeData();
 const rows=data.rows.filter(r=>r.verified&&r.currency==="KES"&&(!from||r.date.slice(0,10)>=from));
 const totals=new Map(data.projects.map((p:any)=>[p.id,{moneyIn:0,moneyOut:0,records:0}]));
 for(const r of rows){const t=totals.get(r.project_id);if(!t)continue;t.records+=1;t[r.kind==="income"?"moneyIn":"moneyOut"]+=r.amount;}
 const lines=[["Project","Owner or managing organisation","Money in KES","Money out KES","Net recorded movement KES","Verified transactions"].map(sanitize).join(",")];
 for(const project of data.projects){
  const t=totals.get(project.id)||{moneyIn:0,moneyOut:0,records:0};
  lines.push([project.name,project.id===data.TUKO_PROJECT_ID?"Third Culture":data.ownerById.get(project.owner_id)||"Owner to confirm",t.moneyIn.toFixed(2),t.moneyOut.toFixed(2),(t.moneyIn-t.moneyOut).toFixed(2),t.records].map(sanitize).join(","));
 }
 lines.push(["Note","Recorded KES movements only. Not bank balances, artist payouts, or company profit","","","",""].map(sanitize).join(","));
 const content="\ufeff"+lines.join("\r\n")+"\r\n";
 const date=new Date().toISOString().slice(0,10).replaceAll("-","");
 return new NextResponse(content,{status:200,headers:{
  "Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":'attachment; filename="FACKTSMusicFinance'+date+'.csv"',
  "Cache-Control":"private, no-store",
  "X-Content-Type-Options":"nosniff"
 }});
}
