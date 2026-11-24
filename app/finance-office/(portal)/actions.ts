"use server";
import {redirect} from "next/navigation";
import {requireControlRoomPermission} from "../../../lib/controlRoom";
import {financeWritesEnabled,TUKO_PROJECT_ID} from "../../../lib/financeBackoffice";
import {createAdminClient} from "../../../lib/supabase/admin";
import {revalidatePath} from "next/cache";
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function createThirdCultureMemberAccount(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 if(!financeWritesEnabled())throw new Error("Member-account creation is not activated. Approval and production enablement are required.");
 const userId=String(fd.get("user_id")||"").trim();
 if(!uuid.test(userId))throw new Error("Invalid member.");
 const db=createAdminClient();
 const {data:member,error:memberError}=await db.from("project_members").select("id").eq("project_id",TUKO_PROJECT_ID).eq("user_id",userId).eq("status","active").maybeSingle();
 if(memberError||!member)throw new Error("This person is not an active member of the Third Culture project.");
 const {data:existing,error:existingError}=await db.from("project_membership_accounts").select("id").eq("project_id",TUKO_PROJECT_ID).eq("member_user_id",userId).maybeSingle();
 if(existingError)throw new Error("Cannot check whether the member account exists.");
 if(existing){redirect("/finance-office/members/"+userId);}
 const memberCode="TC-"+crypto.randomUUID().slice(0,8).toUpperCase();
 const {error}=await db.from("project_membership_accounts").insert({project_id:TUKO_PROJECT_ID,member_user_id:userId,
  member_code:memberCode,allocated_amount:0,monthly_fee:0,currency:"KES",status:"active",
  needs_reconciliation:true,allocation_note:"New account — fee and opening records require reconciliation",created_by:actor.id});
 if(error)throw new Error("Member account could not be created. Check whether an account already exists.");
 await db.from("platform_events").insert({user_id:actor.id,project_id:TUKO_PROJECT_ID,
   event_name:"third_culture_member_account_created",category:"finance",
   entity_type:"profile",entity_id:userId,metadata:{member_code:memberCode}});
 revalidatePath("/finance-office/members");
 revalidatePath("/finance-office/members/"+userId);
 redirect("/finance-office/members/"+userId);
}

const safeRead=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const centsValid=(n:number)=>Number.isFinite(n)&&n>0&&n<=10000000&&Math.abs(n*100-Math.round(n*100))<0.001;
const isoDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s));
function requirePosting(){
 if(!financeWritesEnabled())throw new Error("Finance recording is disabled until review, migration approval and production enablement.");
}
export async function recordMemberContribution(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 requirePosting();
 const userId=safeRead(fd,"user_id"),date=safeRead(fd,"transaction_date"),period=safeRead(fd,"payment_period");
 const amount=Number(safeRead(fd,"amount_kes")),method=safeRead(fd,"payment_method"),reference=safeRead(fd,"payment_reference");
 if(!uuid.test(userId))throw new Error("Invalid member ID.");
 if(!centsValid(amount)||!isoDate(date)||reference.length<3||reference.length>110||!["M-PESA","Bank transfer","Cash","Other"].includes(method))
   throw new Error("Enter a valid amount, payment date, method and receipt reference.");
 if(period&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error("Invalid fee period.");
 if(safeRead(fd,"proof_checked")!=="confirmed")throw new Error("Verify the receipt before recording any contribution.");
 const db=createAdminClient();
 const {data:member}=await db.from("project_members").select("id").eq("project_id",TUKO_PROJECT_ID).eq("user_id",userId).eq("status","active").maybeSingle();
 if(!member)throw new Error("This person is no longer an active project member.");
 const {data:account,error:accountError}=await db.from("project_membership_accounts").select("id").eq("project_id",TUKO_PROJECT_ID).eq("member_user_id",userId).eq("status","active").maybeSingle();
 if(accountError||!account)throw new Error("Set up an active member account before recording contributions.");
 const {data:prior,error:priorError}=await db.from("project_membership_transactions").select("id").eq("project_id",TUKO_PROJECT_ID).eq("payment_reference",reference).limit(1).maybeSingle();
 if(priorError||prior)throw new Error("This receipt reference was used before, or could not be checked.");
 const {data:posted,error}=await db.from("project_membership_transactions").insert({
  project_id:TUKO_PROJECT_ID,account_id:account.id,member_user_id:userId,
  transaction_code:"TC-"+crypto.randomUUID().slice(0,8).toUpperCase(),
  amount,currency:"KES",transaction_date:date,
  payment_method:method,payment_reference:reference,payment_period:period?period+"-01":null,
  note:"Manually posted by Finance after receipt review. Not provider or bank settlement reconciliation.",
  status:"posted",recorded_by:actor.id,
 }).select("id").single();
 if(error||!posted)throw new Error("Could not record the contribution. No entry was posted.");
 await db.from("platform_events").insert({user_id:actor.id,project_id:TUKO_PROJECT_ID,
  event_name:"third_culture_contribution_posted",category:"finance",entity_type:"profile",entity_id:userId,
  metadata:{entry_id:posted.id,amount_kes:amount,method,reference}});
 revalidatePath("/finance-office");revalidatePath("/finance-office/members");
 revalidatePath("/finance-office/members/"+userId);
 redirect("/finance-office/members/"+userId);
}
export async function recordProjectBill(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 requirePosting();
 const projectId=safeRead(fd,"project_id"),category=safeRead(fd,"category"),vendor=safeRead(fd,"vendor");
 const description=safeRead(fd,"description"),date=safeRead(fd,"expense_date"),amount=Number(safeRead(fd,"amount_kes"));
 if(!uuid.test(projectId)||!centsValid(amount)||!isoDate(date)||category.length<2||category.length>90||vendor.length>120||description.length<4||description.length>450)
  throw new Error("Choose a project, amount, date and a clear description.");
 const db=createAdminClient();
 const {data:project}=await db.from("projects").select("id,status").eq("id",projectId).maybeSingle();
 if(!project||project.status!=="active")throw new Error("Choose an active project.");
 const {data:bill,error}=await db.from("project_expenses").insert({
  project_id:projectId,amount,currency:"KES",expense_date:date,category,
  vendor:vendor||null,notes:description,payment_status:"committed",created_by:actor.id
 }).select("id").single();
 if(error||!bill)throw new Error("Unable to save bill. No expense was recorded.");
 await db.from("platform_events").insert({user_id:actor.id,project_id:projectId,
   event_name:"project_bill_created",category:"finance",entity_type:"project_expense",entity_id:bill.id,
   metadata:{amount_kes:amount,category}});
 revalidatePath("/finance-office/bills");revalidatePath("/finance-office");
 redirect("/finance-office/bills?created=1");
}
export async function confirmProjectBillPaid(fd:FormData){
 const actor=await requireControlRoomPermission("finance");
 requirePosting();
 const id=safeRead(fd,"expense_id"),reference=safeRead(fd,"receipt_reference");
 if(!uuid.test(id)||reference.length<3||reference.length>120||safeRead(fd,"payment_confirmed")!=="yes")
  throw new Error("Check payment evidence and provide the receipt reference.");
 const db=createAdminClient();
 const {data:bill}=await db.from("project_expenses").select("id,project_id,payment_status,notes")
  .eq("id",id).eq("payment_status","committed").maybeSingle();
 if(!bill)throw new Error("This bill has already been settled or cannot be found.");
 const note=String(bill.notes||"").slice(0,500);
 const {data:changed,error}=await db.from("project_expenses")
  .update({payment_status:"paid",notes:note+" | Manual payment reference: "+reference,updated_at:new Date().toISOString()})
  .eq("id",id).eq("project_id",bill.project_id).eq("payment_status","committed")
  .select("id").maybeSingle();
 if(error||!changed)throw new Error("Could not confirm this bill; refresh before retrying.");
 await db.from("platform_events").insert({user_id:actor.id,project_id:bill.project_id,
  event_name:"project_bill_payment_confirmed",category:"finance",entity_type:"project_expense",entity_id:id,
  metadata:{receipt_reference:reference}});
 revalidatePath("/finance-office/bills");revalidatePath("/finance-office");
 redirect("/finance-office/bills?confirmed=1");
}
