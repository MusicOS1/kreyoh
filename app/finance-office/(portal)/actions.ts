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
