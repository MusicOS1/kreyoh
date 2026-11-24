// Separate project ledgers from platform/organisation operating books.
// Cash figures are recorded movements, never a bank balance or an artist royalty allocation.
export const TUKO_PROJECT_ID="3bbead35-ed53-4507-9943-ff6255b0f1ce";
export const FINANCE_BOOKS=[
 {slug:"fackts_music_platform",name:"FACKTS Music platform",caption:"Platform operations and service costs"},
 {slug:"third_culture",name:"Third Culture · partner",caption:"Temporary external partner engagement; kept separate from the permanent FACKTS Music business"},
] as const;
// A managed partner project is never a FACKTS-owned artist roster or its business revenue.
export const THIRD_CULTURE_PARTNER={name:"Third Culture",projectId:TUKO_PROJECT_ID,relationship:"temporary_external_partner" as const};
export const isThirdCulturePartnerProject=(projectId:string)=>projectId===TUKO_PROJECT_ID;
export type ProjectFinanceRow={id:string;name:string;code?:string|null;owner_id?:string|null};
type AmountRow={project_id:string;amount:number|string|null;currency?:string|null};
type Revenue=AmountRow&{payment_status?:string|null;revenue_source?:string|null};
type Membership=AmountRow&{status?:string|null};
type Expense=AmountRow&{payment_status?:string|null};
export function isMemberRevenue(value:string|null|undefined){
 const source=String(value||"").toLowerCase();
 return ["membership","member fee","member fees","contribution","member contribution"].some(x=>source.includes(x));
}
const money=(value:number|string|null)=>{
 const n=Number(value);
 return Number.isFinite(n)&&n>0?n:0;
};
export function summariseProjects(projects:ProjectFinanceRow[],revenue:Revenue[],membership:Membership[],expenses:Expense[]){
 const result=new Map<string,{received:number;spent:number;net:number;membership:number;commercial:number}>();
 for(const p of projects)result.set(p.id,{received:0,spent:0,net:0,membership:0,commercial:0});
 for(const r of revenue){const row=result.get(r.project_id);if(!row||r.currency!=="KES"||r.payment_status!=="paid"||isMemberRevenue(r.revenue_source))continue;row.commercial+=money(r.amount);}
 for(const r of membership){const row=result.get(r.project_id);if(!row||r.currency!=="KES"||r.status!=="posted")continue;row.membership+=money(r.amount);}
 for(const r of expenses){const row=result.get(r.project_id);if(!row||r.currency!=="KES"||r.payment_status!=="paid")continue;row.spent+=money(r.amount);}
 for(const row of result.values()){row.received=row.membership+row.commercial;row.net=row.received-row.spent;}
 return result;
}
export function recordedBookTotals(entries:{book_id:string;entry_type:string;amount_kes:number|string;status:string}[]){
 const totals=new Map<string,{income:number;expense:number}>();
 for(const entry of entries){
   if(entry.status!=="posted")continue;
   const current=totals.get(entry.book_id)||{income:0,expense:0};
   if(entry.entry_type==="income")current.income+=money(entry.amount_kes);
   if(entry.entry_type==="expense")current.expense+=money(entry.amount_kes);
   totals.set(entry.book_id,current);
 }
 return totals;
}
export function financeWritesEnabled(){
 return process.env.FINANCE_BACKOFFICE_WRITES_ENABLED==="true"&&process.env.VERCEL_ENV==="production";
}
