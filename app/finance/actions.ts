"use server";
import {revalidatePath} from "next/cache";
import {getWorkspace,hasAnyRole} from "../../lib/workspace";
import {notifyUser} from "../../lib/projectNotifications";
const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
const allowed=["Super Admin","Admin","Project Lead","Finance"];

export async function saveProjectBudget(fd:FormData){const{admin,user,project,roles}=await getWorkspace();if(!project||!hasAnyRole(roles,allowed))throw new Error("Finance access required.");const amount=Number(read(fd,"budget_amount"));if(!Number.isFinite(amount)||amount<0)throw new Error("Enter a valid budget.");const{error}=await admin.from("project_budgets").upsert({project_id:project.id,budget_amount:amount,currency:read(fd,"currency")||"KES",updated_by:user.id,updated_at:new Date().toISOString()});if(error)throw new Error(error.message);revalidatePath("/finance");}

export async function addProjectExpense(fd:FormData){const{admin,user,project,roles}=await getWorkspace();if(!project||!hasAnyRole(roles,allowed))throw new Error("Finance access required.");const amount=Number(read(fd,"amount"));if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter a valid expense.");const{error}=await admin.from("project_expenses").insert({project_id:project.id,track_id:read(fd,"track_id")||null,amount,currency:read(fd,"currency")||"KES",expense_date:read(fd,"expense_date")||new Date().toISOString().slice(0,10),category:read(fd,"category"),vendor:read(fd,"vendor")||null,payment_status:read(fd,"payment_status")||"committed",notes:read(fd,"notes")||null,created_by:user.id});if(error)throw new Error(error.message);revalidatePath("/finance");}

export async function addRevenueRecord(fd:FormData){const{admin,user,project,roles}=await getWorkspace();if(!project||!hasAnyRole(roles,allowed))throw new Error("Finance access required.");const amount=Number(read(fd,"amount"));if(!Number.isFinite(amount)||amount<0)throw new Error("Enter a valid amount.");const{error}=await admin.from("revenue_records").insert({project_id:project.id,track_id:read(fd,"track_id")||null,opportunity_id:read(fd,"opportunity_id")||null,revenue_source:read(fd,"revenue_source"),amount,currency:read(fd,"currency")||"KES",expected_date:read(fd,"expected_date")||null,received_date:read(fd,"received_date")||null,payment_status:read(fd,"payment_status")||"expected",notes:read(fd,"notes")||null,created_by:user.id});if(error)throw new Error(error.message);revalidatePath("/finance");}


export async function saveMembershipPledge(fd:FormData){const{admin,user,project,roles}=await getWorkspace();if(!project||!hasAnyRole(roles,allowed))throw new Error("Finance access required.");const amount=Number(read(fd,"pledged_amount"));if(!Number.isFinite(amount)||amount<0)throw new Error("Enter a valid membership pledge.");const currency=read(fd,"currency")||"KES";const{error}=await admin.from("project_membership_pledges").upsert({project_id:project.id,pledged_amount:amount,currency,notes:read(fd,"notes")||null,updated_by:user.id,updated_at:new Date().toISOString()});if(error)throw new Error(error.message);await admin.from("platform_events").insert({user_id:user.id,project_id:project.id,event_name:"membership_pledge_updated",category:"finance",entity_type:"project",entity_id:project.id,metadata:{pledged_amount:amount,currency}});revalidatePath("/finance");}
export async function recordMembershipFee(fd:FormData){
 const{admin,user,project,roles}=await getWorkspace();if(!project||!hasAnyRole(roles,allowed))throw new Error("Finance access required.");
 const memberUserId=read(fd,"member_user_id"),feePeriod=read(fd,"fee_period"),amountDue=Number(read(fd,"amount_due")),amountPaid=Number(read(fd,"amount_paid")||0),currency=read(fd,"currency")||"KES",paymentStatus=read(fd,"payment_status")||"expected";
 if(!memberUserId||!feePeriod)throw new Error("Choose a member and fee period.");
 if(!Number.isFinite(amountDue)||amountDue<0||!Number.isFinite(amountPaid)||amountPaid<0)throw new Error("Enter valid membership amounts.");
 if(amountDue>0&&amountPaid>amountDue)throw new Error("Amount paid cannot exceed amount due.");
 const{data:membership}=await admin.from("project_members").select("id").eq("project_id",project.id).eq("user_id",memberUserId).eq("status","active").maybeSingle();
 if(!membership)throw new Error("That person is not an active project member.");
 const{error}=await admin.from("project_membership_fees").upsert({project_id:project.id,member_user_id:memberUserId,fee_period:feePeriod,amount_due:amountDue,amount_paid:amountPaid,currency,due_date:read(fd,"due_date")||null,paid_date:read(fd,"paid_date")||null,payment_status:paymentStatus,payment_reference:read(fd,"payment_reference")||null,notes:read(fd,"notes")||null,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:"project_id,member_user_id,fee_period"});
 if(error)throw new Error(error.message);
 await notifyUser(admin,{userId:memberUserId,projectId:project.id,type:"membership_fee_updated",title:"Membership fee record updated",body:`${feePeriod}: ${currency} ${amountPaid.toLocaleString("en-KE")} paid of ${currency} ${amountDue.toLocaleString("en-KE")}.`,entityType:"project",entityId:project.id});
 await admin.from("platform_events").insert({user_id:user.id,project_id:project.id,event_name:"membership_fee_updated",category:"finance",entity_type:"profile",entity_id:memberUserId,metadata:{fee_period:feePeriod,payment_status:paymentStatus,currency}});
 revalidatePath("/finance");revalidatePath("/notifications");
}
