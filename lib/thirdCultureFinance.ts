import "server-only";
import {createAdminClient} from "./supabase/admin";
import {requireControlRoomPermission} from "./controlRoom";
import {readAllRows} from "./recordReads";
import {TUKO_PROJECT_ID} from "./financeBackoffice";
import {safeAmount} from "./financeOfficeData";
export type CultureMember={
 userId:string;name:string;email:string|null;joinedAt:string;memberId:string;
 accountId:string|null;memberCode:string|null;monthlyFee:number|null;allocated:number|null;
 needsReconciliation:boolean;status:string;
 received:number;payments:number;lastPayment:string|null;
};
export async function getThirdCultureMemberFinance(){
 await requireControlRoomPermission("finance");
 const db=createAdminClient();
 const [people,accounts,transactions]=await Promise.all([
  readAllRows(()=>db.from("project_members").select("id,user_id,status,joined_at").eq("project_id",TUKO_PROJECT_ID).eq("status","active").order("joined_at")),
  readAllRows(()=>db.from("project_membership_accounts").select("id,member_user_id,member_code,monthly_fee,allocated_amount,needs_reconciliation,status").eq("project_id",TUKO_PROJECT_ID).order("id")),
  readAllRows(()=>db.from("project_membership_transactions").select("id,member_user_id,account_id,transaction_code,amount,currency,status,transaction_date,payment_period,payment_method,payment_reference,note").eq("project_id",TUKO_PROJECT_ID).order("transaction_date",{ascending:false}).order("id"))
 ]);
 if(people.error||accounts.error||transactions.error)throw new Error("Could not verify Third Culture member finance. Nothing was changed.");
 const ids=(people.data||[]).map((p:any)=>p.user_id);
 const profiles=ids.length?await db.from("profiles").select("id,stage_name,full_name,email").in("id",ids):{data:[],error:null};
 if(profiles.error)throw new Error("Could not load Third Culture members.");
 const profileMap=new Map((profiles.data||[]).map((p:any)=>[p.id,p]));
 const accountMap=new Map((accounts.data||[]).map((a:any)=>[a.member_user_id,a]));
 const entries=transactions.data||[];
 const members:CultureMember[]=(people.data||[]).map((m:any)=>{
  const p=profileMap.get(m.user_id),account=accountMap.get(m.user_id);
  const posted=entries.filter((t:any)=>t.member_user_id===m.user_id&&t.status==="posted"&&t.currency==="KES");
  return {userId:m.user_id,memberId:m.id,joinedAt:m.joined_at||"",name:p?.stage_name||p?.full_name||p?.email||"Unnamed member",
   email:p?.email||null,accountId:account?.id||null,memberCode:account?.member_code||null,
   monthlyFee:account?safeAmount(account.monthly_fee):null,allocated:account?safeAmount(account.allocated_amount):null,
   needsReconciliation:Boolean(account?.needs_reconciliation),status:account?.status||"setup needed",
   received:posted.reduce((s:number,t:any)=>s+safeAmount(t.amount),0),
   payments:posted.length,lastPayment:posted.length?posted[0].transaction_date:null};
 });
 return {members,transactions:entries,accountCount:members.filter(m=>m.accountId).length};
}
