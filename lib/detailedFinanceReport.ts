import "server-only";
import {createAdminClient} from "./supabase/admin";
import {requireControlRoomPermission} from "./controlRoom";
import {readAllRows} from "./recordReads";
import {TUKO_PROJECT_ID,isMemberRevenue} from "./financeBackoffice";

export type ReportRow={id:string;code:string;date:string;party:string;reference:string;method:string;purpose:string;amount:number;currency:string;status:string;kind:"income"|"expense";ledger:string;counted:boolean;warning:string};
const text=(v:unknown)=>String(v??"");
const amount=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
export const localDay=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:v&&!Number.isNaN(Date.parse(v))?new Date(Date.parse(v)+10800000).toISOString().slice(0,10):"";
export function reportPeriod(value:string|undefined,from?:string,to?:string,now=new Date()){
 const period=["7","30","90","365","all","custom"].includes(value||"")?value!:"30";
 const today=localDay(now.toISOString());
 const valid=(s?:string)=>Boolean(s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);
 if(period==="custom"&&(!valid(from)||!valid(to)||from!>to!))return {period:"custom",from:"",to:"",invalid:true};
 const start=period==="all"?"":period==="custom"?from!:new Date(Date.parse(today)-(Number(period)-1)*86400000).toISOString().slice(0,10);
 return {period,from:start,to:period==="all"?"":period==="custom"?to!:today,invalid:false};
}
export async function loadDetailedFinanceReport(projectId:string){
 await requireControlRoomPermission("finance");
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId))return null;
 const db=createAdminClient();
 const project=await db.from("projects").select("id,name").eq("id",projectId).maybeSingle();
 if(project.error)throw new Error("Project cannot be verified.");
 if(!project.data)return null;
 const [members,revenue,expenses,invoiceR]=await Promise.all([
  readAllRows(()=>db.from("project_membership_transactions").select("id,member_user_id,transaction_code,amount,currency,transaction_date,payment_method,payment_reference,status").eq("project_id",projectId).order("id")),
  readAllRows(()=>db.from("revenue_records").select("id,revenue_source,amount,currency,received_date,expected_date,created_at,payment_status,notes").eq("project_id",projectId).order("id")),
  readAllRows(()=>db.from("project_expenses").select("id,category,vendor,notes,amount,currency,expense_date,created_at,payment_status").eq("project_id",projectId).order("id")),
  readAllRows(()=>db.from("project_payment_invoices").select("id,description,purpose,amount_kes,status,payer_email,created_at,paid_at").eq("project_id",projectId).order("id"))
 ]);
 if(members.error||revenue.error||expenses.error||invoiceR.error)throw new Error("Report records could not be verified. Totals withheld.");
 const profileMap=new Map<string,string>(),receiptMap=new Map<string,any>(),attempts:any[]=[];
 const memberIds=[...new Set((members.data||[]).map(m=>m.member_user_id).filter(Boolean))];
 const invoiceIds=(invoiceR.data||[]).map(i=>i.id);
 for(let i=0;i<memberIds.length;i+=100){
  const r=await db.from("profiles").select("id,stage_name,full_name,email").in("id",memberIds.slice(i,i+100));
  if(r.error)throw new Error("Member names cannot be verified.");
  for(const p of r.data||[])profileMap.set(p.id,p.stage_name||p.full_name||p.email||"Not recorded");
 }
 for(let i=0;i<invoiceIds.length;i+=100){
  const batch=invoiceIds.slice(i,i+100);
  const [r,a]=await Promise.all([
   readAllRows(()=>db.from("project_payment_receipts").select("revenue_record_id,reference,provider_transaction_id,payer_email,mode").in("invoice_id",batch).order("id")),
   readAllRows(()=>db.from("project_payment_attempts").select("id,invoice_id,reference,payer_email,mode,status,created_at").in("invoice_id",batch).order("id"))
  ]);
  if(r.error||a.error)throw new Error("Payment references cannot be verified.");
  for(const p of r.data||[])if(p.revenue_record_id&&p.mode==="live")receiptMap.set(p.revenue_record_id,p);
  attempts.push(...(a.data||[]));
 }
 const rows:ReportRow[]=[];
 const refCode=(v:string)=>v.match(/(?:M-?PESA Ref ID:\s*)([A-Z0-9]+)/i)?.[1]||v.match(/^([A-Z0-9]{8,12})(?:\s|$)/i)?.[1]||v;
 const memberRefs=new Map<string,number>();
 for(const m of members.data||[]){const r=refCode(text(m.payment_reference)).toUpperCase();if(r&&m.status==="posted")memberRefs.set(r,(memberRefs.get(r)||0)+1);}
 for(const m of members.data||[]){
  const ref=refCode(text(m.payment_reference)),raw=text(m.payment_reference);
  const receiptAmount=raw.match(/(?:received\s+(?:Ksh|KES)\s*|(?:Ksh|KES)\s*)([\d,]+(?:\.\d+)?)/i);
  const warnings=[(memberRefs.get(ref.toUpperCase())||0)>1?"Repeated receipt reference; check allocation or duplicate": "",receiptAmount&&Number(receiptAmount[1].replaceAll(",",""))!==amount(m.amount)?"Receipt amount differs from ledger amount":"",/sent to|transfer of.* to /i.test(raw)?"Receipt describes outgoing transfer; verify treatment":""].filter(Boolean).join("; ");
  rows.push({id:m.id,code:m.transaction_code||m.id,date:localDay(m.transaction_date||""),party:profileMap.get(m.member_user_id)||"Not recorded",reference:ref,method:m.payment_method||"",purpose:"Member contribution",amount:amount(m.amount),currency:m.currency||"Unknown",status:m.status||"unknown",kind:"income",ledger:"Project",counted:m.status==="posted"&&m.currency==="KES",warning:warnings});
 }
 for(const r of revenue.data||[]){
  const receipt=receiptMap.get(r.id),memberCopy=isMemberRevenue(r.revenue_source);
  rows.push({id:r.id,code:r.id,date:localDay(r.received_date||r.expected_date||r.created_at||""),party:receipt?.payer_email||"Not recorded",reference:[receipt?.reference,receipt?.provider_transaction_id].filter(Boolean).join(" / ")||text(r.notes).match(/Reference: (FMPS-[a-f0-9]+)\./i)?.[1]||"",method:receipt?"Paystack / M-PESA":"",purpose:r.revenue_source||"Project income",amount:amount(r.amount),currency:r.currency||"Unknown",status:r.payment_status||"unknown",kind:"income",ledger:"Project",counted:!memberCopy&&r.payment_status==="paid"&&r.currency==="KES",warning:memberCopy?"Membership revenue copy / expectation; excluded from totals":""});
 }
 for(const e of expenses.data||[])rows.push({id:e.id,code:e.id,date:localDay(e.expense_date||e.created_at||""),party:e.vendor||"Not recorded",reference:text(e.notes).match(/Manual payment reference: (.+)$/)?.[1]||"",method:"",purpose:e.category||"Project expense",amount:amount(e.amount),currency:e.currency||"Unknown",status:e.payment_status||"unknown",kind:"expense",ledger:"Project",counted:e.payment_status==="paid"&&e.currency==="KES",warning:""});
 const invoices=new Map((invoiceR.data||[]).map(i=>[i.id,i]));
 for(const a of attempts){
  const inv=invoices.get(a.invoice_id);if(!inv||a.mode!=="live"||a.status==="succeeded")continue;
  rows.push({id:a.id,code:a.id,date:localDay(a.created_at||""),party:a.payer_email||inv.payer_email||"Not recorded",reference:a.reference||"",method:"Paystack / M-PESA",purpose:inv.description||inv.purpose||"Payment attempt",amount:amount(inv.amount_kes),currency:"KES",status:a.status||"unknown",kind:"income",ledger:"Payment attempts",counted:false,warning:"Unposted attempt; excluded from cash totals"});
 }
 let bookAvailable=true;
 if(projectId===TUKO_PROJECT_ID){
  const book=await db.from("finance_books").select("id").eq("slug","third_culture").maybeSingle();
  bookAvailable=!book.error&&Boolean(book.data);
  if(book.data&&!book.error){
   const entries=await readAllRows(()=>db.from("finance_book_entries").select("id,entry_type,amount_kes,category,description,reference,entry_date,status").eq("book_id",book.data!.id).order("id"));
   bookAvailable=!entries.error;
   for(const e of entries.data||[])rows.push({id:e.id,code:e.id,date:localDay(e.entry_date||""),party:"Not recorded",reference:e.reference||"",method:"",purpose:[e.category,e.description].filter(Boolean).join(" · "),amount:amount(e.amount_kes),currency:"KES",status:e.status||"unknown",kind:e.entry_type==="expense"?"expense":"income",ledger:"Partner operating book",counted:e.status==="posted",warning:"Separate operating ledger; not added to project totals"});
  }
 }
 return {project:project.data,rows:rows.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)),bookAvailable};
}
export function filteredReport(rows:ReportRow[],range:ReturnType<typeof reportPeriod>,q=""){
 if(range.invalid)return [];
 const search=q.trim().toLowerCase().slice(0,150);
 return rows.filter(r=>(!range.from||r.date>=range.from)&&(!range.to||r.date<=range.to)&&(!search||[r.code,r.id,r.party,r.reference,r.purpose,r.status].some(v=>v.toLowerCase().includes(search))));
}
export function reportTotals(rows:ReportRow[],ledger="Project"){
 return rows.filter(r=>r.counted&&r.ledger===ledger&&r.currency==="KES").reduce((t,r)=>{t[r.kind]+=Math.round(r.amount*100);return t;},{income:0,expense:0});
}
export function groupReport(rows:ReportRow[]){
 const groups=new Map<string,ReportRow[]>();
 for(const row of rows){const key=row.date.slice(0,7)||"Undated";const group=groups.get(key)||[];group.push(row);groups.set(key,group);}
 return [...groups.entries()];
}
