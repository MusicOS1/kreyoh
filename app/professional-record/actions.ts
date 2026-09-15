"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";
import { isSuperAdmin } from "../../lib/controlRoom";

const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();

export async function createProfessionalClaim(fd:FormData){
  const{admin,user,project}=await getWorkspace();
  const workTitle=read(fd,"work_title"),role=read(fd,"contribution_role");
  if(!workTitle||!role)throw new Error("Work title and contribution are required.");

  const{error}=await admin.from("professional_credit_claims").insert({
    claimant_id:user.id,
    project_id:project?.id||null,
    work_title:workTitle,
    primary_artist:read(fd,"primary_artist")||null,
    contribution_role:role,
    source_type:"external",
    source_url:read(fd,"source_url")||null,
    verification_status:"self_claimed",
  });
  if(error)throw new Error(error.message);
  revalidatePath("/professional-record");
}

export async function addClaimEvidence(fd:FormData){
  const{admin,user}=await getWorkspace();
  const claimId=read(fd,"claim_id");
  const{data:claim}=await admin.from("professional_credit_claims").select("id,claimant_id,verification_status").eq("id",claimId).eq("claimant_id",user.id).maybeSingle();
  if(!claim)throw new Error("Claim not found.");

  const{error}=await admin.from("professional_credit_evidence").insert({
    claim_id:claimId,
    evidence_type:read(fd,"evidence_type")||"other",
    evidence_url:read(fd,"evidence_url")||null,
    notes:read(fd,"notes")||null,
    added_by:user.id,
  });
  if(error)throw new Error(error.message);

  if(claim.verification_status==="self_claimed"){
    await admin.from("professional_credit_claims").update({verification_status:"evidence_attached",updated_at:new Date().toISOString()}).eq("id",claimId);
  }
  revalidatePath("/professional-record");
}

export async function requestClaimConfirmation(fd:FormData){
  const{admin,user}=await getWorkspace();
  const claimId=read(fd,"claim_id"),confirmerId=read(fd,"confirmer_id");
  if(!confirmerId||confirmerId===user.id)throw new Error("Choose another FACKTS creator to confirm the credit.");

  const{data:claim}=await admin.from("professional_credit_claims").select("id,claimant_id,work_title,contribution_role").eq("id",claimId).eq("claimant_id",user.id).maybeSingle();
  if(!claim)throw new Error("Claim not found.");

  const{error}=await admin.from("professional_credit_confirmations").upsert({
    claim_id:claimId,
    confirmer_id:confirmerId,
    response:"requested",
    note:null,
    requested_at:new Date().toISOString(),
    responded_at:null,
  },{onConflict:"claim_id,confirmer_id"});
  if(error)throw new Error(error.message);

  await admin.from("notifications").insert({
    user_id:confirmerId,
    project_id:null,
    type:"credit_confirmation_requested",
    title:"Credit confirmation requested",
    body:`A FACKTS creator says they were ${claim.contribution_role} on ${claim.work_title}. Confirm, correct or dispute the claim.`,
    entity_type:"professional_credit_claim",
    entity_id:claimId,
  });

  revalidatePath("/professional-record");
}

export async function respondToCreditClaim(fd:FormData){
  const{admin,user}=await getWorkspace();
  const confirmationId=read(fd,"confirmation_id"),response=read(fd,"response");
  if(!["confirmed","corrected","disputed"].includes(response))throw new Error("Choose a valid response.");

  const{data:confirmation}=await admin.from("professional_credit_confirmations").select("id,claim_id,confirmer_id").eq("id",confirmationId).eq("confirmer_id",user.id).maybeSingle();
  if(!confirmation)throw new Error("Confirmation request not found.");

  const{error}=await admin.from("professional_credit_confirmations").update({
    response,
    note:read(fd,"note")||null,
    responded_at:new Date().toISOString(),
  }).eq("id",confirmationId);
  if(error)throw new Error(error.message);

  const newStatus=response==="confirmed"?"contributor_confirmed":response==="disputed"?"disputed":"evidence_attached";
  await admin.from("professional_credit_claims").update({verification_status:newStatus,updated_at:new Date().toISOString()}).eq("id",confirmation.claim_id).neq("verification_status","fackts_verified");

  const{data:claim}=await admin.from("professional_credit_claims").select("claimant_id,work_title").eq("id",confirmation.claim_id).maybeSingle();
  if(claim){
    await admin.from("notifications").insert({
      user_id:claim.claimant_id,
      project_id:null,
      type:"credit_confirmation_response",
      title:response==="confirmed"?"Credit confirmed":response==="disputed"?"Credit disputed":"Credit needs correction",
      body:`${claim.work_title}: a requested confirmer responded ${response}.`,
      entity_type:"professional_credit_claim",
      entity_id:confirmation.claim_id,
    });
  }

  revalidatePath("/professional-record");
}

export async function verifyProfessionalClaim(fd:FormData){
  const{admin,user}=await getWorkspace();
  if(!(await isSuperAdmin(user.id)))throw new Error("Only Super Admin can issue FACKTS Verified status.");

  const claimId=read(fd,"claim_id");
  const[{data:claim},{count:evidenceCount},{count:confirmedCount},{count:disputedCount}]=await Promise.all([
    admin.from("professional_credit_claims").select("id,verification_status").eq("id",claimId).maybeSingle(),
    admin.from("professional_credit_evidence").select("id",{count:"exact",head:true}).eq("claim_id",claimId),
    admin.from("professional_credit_confirmations").select("id",{count:"exact",head:true}).eq("claim_id",claimId).eq("response","confirmed"),
    admin.from("professional_credit_confirmations").select("id",{count:"exact",head:true}).eq("claim_id",claimId).eq("response","disputed"),
  ]);

  if(!claim)throw new Error("Claim not found.");
  if((evidenceCount||0)<1)throw new Error("Attach evidence before FACKTS verification.");
  if((confirmedCount||0)<1)throw new Error("At least one relevant FACKTS creator must confirm this external credit first.");
  if((disputedCount||0)>0||claim.verification_status==="disputed")throw new Error("Resolve the dispute before verification.");

  const{error}=await admin.from("professional_credit_claims").update({
    verification_status:"fackts_verified",
    verification_note:read(fd,"verification_note")||"Evidence and contributor confirmation reviewed.",
    verified_by:user.id,
    verified_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
  }).eq("id",claimId);
  if(error)throw new Error(error.message);

  revalidatePath("/professional-record");
}
