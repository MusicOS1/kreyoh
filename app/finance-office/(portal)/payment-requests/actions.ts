"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {financeWritesEnabled} from "../../../../lib/financeBackoffice";
import {validateFinanceRequest} from "../../../../lib/financePaymentRequests";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
export async function createFinancePaymentRequest(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 if(!financeWritesEnabled())throw new Error("Finance requests are not enabled in preview. The request table and production controls must be approved first.");
 const category=read(fd,"purpose_code"),account=read(fd,"receiver_scope"),
   projectId=read(fd,"project_id"),recurrence=read(fd,"recurrence"),
   description=read(fd,"description"),email=read(fd,"payer_email").toLowerCase(),
   expiry=read(fd,"expiry_date"),amount=Number(read(fd,"amount_kes"));
 const issue=validateFinanceRequest({category,account,projectId,recurrence,description,amount,email,expiry});
 if(issue)throw new Error(issue);
 const admin=createAdminClient();
 if(account==="project"){
  const {data:project,error}=await admin.from("projects").select("id,status").eq("id",projectId).maybeSingle();
  if(error||!project||project.status!=="active")throw new Error("Choose a currently active project.");
 }
 // Every new category is a DRAFT, never a live charge. Beneficiaries
 // and revenue splits must be reviewed independently of payment collection.
 const {data:record,error}=await admin.from("finance_payment_requests").insert({
   purpose_code:category,receiver_scope:account,project_id:account==="project"?projectId:null,
   description,amount_kes:amount,recurrence,payer_email:email||null,expiry_date:expiry||null,
   status:"draft",checkout_state:"not_configured",created_by:actor.id
 }).select("id").single();
 if(error||!record)throw new Error("The payment request could not be saved. No payment link or charge was activated.");
 await admin.from("platform_events").insert({
  user_id:actor.id,event_name:"finance_payment_request_drafted",category:"finance",
  entity_type:"finance_payment_request",entity_id:record.id,
  metadata:{purpose_code:category,receiver_scope:account,amount_kes:amount}
 });
 revalidatePath("/finance-office/payment-requests");
 redirect("/finance-office/payment-requests?created=1");
}
export async function cancelFinancePaymentRequest(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 if(!financeWritesEnabled())throw new Error("Payment-request changes are disabled in preview.");
 const id=read(fd,"request_id");
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new Error("Invalid payment request.");
 const admin=createAdminClient();
 const {data:changed,error}=await admin.from("finance_payment_requests")
  .update({status:"cancelled",updated_at:new Date().toISOString()})
  .eq("id",id).in("status",["draft","review_required","approved","paused"])
  .select("id").maybeSingle();
 if(error||!changed)throw new Error("This request could not be cancelled. It may already be closed.");
 await admin.from("platform_events").insert({
  user_id:actor.id,event_name:"finance_payment_request_cancelled",category:"finance",
  entity_type:"finance_payment_request",entity_id:id,metadata:{}
 });
 revalidatePath("/finance-office/payment-requests");
}
