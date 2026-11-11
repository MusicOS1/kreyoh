"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../../lib/controlRoom";
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Rejection never deletes a recording or erases a historical claim.
export async function rejectCatalogueClaim(form:FormData){
 const {id:reviewerId}=await requireControlRoomPermission("music");
 const claimId=String(form.get("claim_id")||"").trim();
 const note=String(form.get("review_note")||"").trim().slice(0,1000);
 if(!uuid.test(claimId)||note.length<20)throw new Error("Select a valid claim and record a substantive review reason (20+ characters).");
 const {createAdminClient}=await import("../../../../../lib/supabase/admin");
 const admin=createAdminClient();
 const {data:claim,error:loadError}=await admin.from("professional_credit_claims")
  .select("id,claimant_id,release_id,work_title,verification_status")
  .eq("id",claimId).not("release_id","is",null).maybeSingle();
 if(loadError||!claim||["fackts_verified","withdrawn"].includes(claim.verification_status))
  throw new Error("This release claim is not eligible for rejection.");
 const {data:rejected,error}=await admin.from("professional_credit_claims")
  .update({verification_status:"rejected",verification_note:note,verified_by:reviewerId,
   verified_at:new Date().toISOString(),updated_at:new Date().toISOString()})
  .eq("id",claimId).in("verification_status",["self_claimed","evidence_attached","contributor_confirmed","disputed"])
  .select("id").maybeSingle();
 if(error||!rejected)throw new Error("This claim changed. Reload before reviewing.");
 await admin.from("notifications").insert({
  user_id:claim.claimant_id,project_id:null,type:"credit_claim_reviewed",
  title:"Credit claim needs correction",
  body:`${claim.work_title}: your credit claim was not approved. Open My Professional Record for review details.`,
  entity_type:"professional_credit_claim",entity_id:claim.id
 });
 revalidatePath("/admin/catalogue/claims");revalidatePath("/professional-record");
}
