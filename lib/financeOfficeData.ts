import "server-only";
import {createAdminClient} from "./supabase/admin";
import {requireControlRoomPermission} from "./controlRoom";
import {readAllRows} from "./recordReads";
import {FINANCE_BOOKS,TUKO_PROJECT_ID,isMemberRevenue,summariseProjects,recordedBookTotals} from "./financeBackoffice";

export type FinanceMovement={
 id:string;project_id:string;kind:"income"|"expense";source:"membership"|"revenue"|"expense";
 date:string;description:string;amount:number;currency:string;status:string;verified:boolean;member_user_id?:string|null;
};
export const fmtKES=(n:number)=>"KES "+n.toLocaleString("en-KE",{minimumFractionDigits:0,maximumFractionDigits:2});
export const periodStart=(period:string)=>{
 const now=new Date(),n=period==="90"?90:period==="365"?365:30;
 return new Date(now.getTime()-n*86400000);
};
export const formatDate=(iso:string)=>iso?new Date(iso).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric",timeZone:"Africa/Nairobi"}):"—";
export const safeAmount=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;};
const sortDate=(row:{date:string})=>row.date||"";
export function asMovements(revenue:any[],membership:any[],expenses:any[]):FinanceMovement[]{
 const out:FinanceMovement[]=[];
 for(const r of revenue){
  const source=String(r.revenue_source||"");
  // Membership is recorded in its own ledger. Never double count its legacy revenue copy.
  if(isMemberRevenue(source))continue;
  out.push({id:r.id,project_id:r.project_id,kind:"income",source:"revenue",
   date:r.received_date||r.expected_date||r.created_at||"",description:source||"Project income",
   amount:safeAmount(r.amount),currency:r.currency||"KES",
   status:r.payment_status||"unverified",verified:r.payment_status==="paid"&&r.currency==="KES"});
 }
 for(const m of membership){
  out.push({id:m.id,project_id:m.project_id,kind:"income",source:"membership",
   date:m.transaction_date||m.created_at||"",description:"Member contribution",
   amount:safeAmount(m.amount),currency:m.currency||"KES",status:m.status||"unverified",
   verified:m.status==="posted"&&m.currency==="KES",member_user_id:m.member_user_id});
 }
 for(const e of expenses){
  out.push({id:e.id,project_id:e.project_id,kind:"expense",source:"expense",
   date:e.expense_date||e.created_at||"",description:e.category||"Project expense",
   amount:safeAmount(e.amount),currency:e.currency||"KES",status:e.payment_status||"unverified",
   verified:e.payment_status==="paid"&&e.currency==="KES"});
 }
 return out.sort((a,b)=>sortDate(b).localeCompare(sortDate(a)));
}
export function monthlyMovements(rows:FinanceMovement[],months=6,now=new Date()){
 const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-(months-1),1));
 const slots=Array.from({length:months},(_,i)=>{
  const day=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+i,1));
  return {key:day.toISOString().slice(0,7),label:day.toLocaleDateString("en-KE",{month:"short",timeZone:"UTC"}),income:0,expense:0};
 });
 for(const row of rows){
  if(!row.verified||row.currency!=="KES")continue;
  const slot=slots.find(s=>s.key===row.date.slice(0,7));
  if(slot)slot[row.kind]+=row.amount;
 }
 return slots;
}
export async function loadFinanceOfficeData(){
 await requireControlRoomPermission("finance");
 const db=createAdminClient();
 const [projects,revenues,memberships,expenses,invoices,books]=await Promise.all([
  readAllRows(()=>db.from("projects").select("id,code,name,owner_id,status").order("name").order("id")),
  readAllRows(()=>db.from("revenue_records").select("id,project_id,revenue_source,amount,currency,payment_status,received_date,expected_date,created_at").order("id")),
  readAllRows(()=>db.from("project_membership_transactions").select("id,account_id,project_id,member_user_id,transaction_code,amount,currency,status,transaction_date,payment_period,created_at").order("id")),
  readAllRows(()=>db.from("project_expenses").select("id,project_id,category,amount,currency,payment_status,expense_date,created_at").order("id")),
  readAllRows(()=>db.from("project_payment_invoices").select("id,project_id,public_token,purpose,description,amount_kes,status,payer_email,created_at,paid_at").order("id")),
  db.from("finance_books").select("id,slug,name,description").in("slug",FINANCE_BOOKS.map(b=>b.slug))
 ]);
 const error=projects.error||revenues.error||memberships.error||expenses.error||invoices.error;
 if(error)throw new Error("The Finance Office could not verify all project financial records. No totals are shown.");
 const list=projects.data||[];
 const bookList=books.error?[]:books.data||[];
 const bookIds=bookList.map((b:any)=>b.id);
 const entries=bookIds.length?await readAllRows(()=>db.from("finance_book_entries")
  .select("id,book_id,entry_type,amount_kes,status,entry_date,description,category,reference,created_at").in("book_id",bookIds).order("id")):
  {data:[],error:books.error,count:0};
 const bookReady=!books.error&&!entries.error&&bookList.length===FINANCE_BOOKS.length;
 const ownerIds=[...new Set(list.map((p:any)=>p.owner_id).filter(Boolean))] as string[];
 const ownerR=ownerIds.length?await db.from("profiles").select("id,stage_name,full_name,email").in("id",ownerIds):{data:[],error:null};
 if(ownerR.error)throw new Error("Finance owner records could not be verified.");
 const ownerById=new Map((ownerR.data||[]).map((p:any)=>[p.id,p.stage_name||p.full_name||p.email||"Owner unassigned"]));
 const rows=asMovements(revenues.data||[],memberships.data||[],expenses.data||[]);
 const totals=summariseProjects(list as any[],revenues.data||[],memberships.data||[],expenses.data||[]);
 const bookTotals=bookReady?recordedBookTotals(entries.data||[]):new Map<string,{income:number;expense:number}>();
 const posted=rows.filter(row=>row.verified&&row.currency==="KES");
 const totalIn=posted.filter(row=>row.kind==="income").reduce((acc,row)=>acc+row.amount,0);
 const totalOut=posted.filter(row=>row.kind==="expense").reduce((acc,row)=>acc+row.amount,0);
 return {projects:list,ownerById,rows,invoices:invoices.data||[],totals,books:bookList,bookReady,bookDataAvailable:!books.error&&!entries.error,bookTotals,
   financeBooks:FINANCE_BOOKS,TUKO_PROJECT_ID,totalIn,totalOut,
   memberTransactions:memberships.data||[],bookEntries:entries.data||[]};
}
