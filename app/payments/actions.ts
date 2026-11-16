"use server";

import {redirect} from "next/navigation";
import {getWorkspace} from "../../lib/workspace";
import {canEditProjectFinance} from "../../lib/financeAccess";
import {isPurposeAllowedForPaymentMode} from "../../lib/paystackPaymentPolicy";

const purposes=["recording_session","project_contribution","camera_hire","set_design","production_service"];
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function createPaymentInvoice(formData:FormData){
  const {admin,user,project,roles}=await getWorkspace();
  if(!project||!canEditProjectFinance(roles))throw new Error("Project finance administrator access required.");
  const purpose=String(formData.get("purpose")||"");
  const description=String(formData.get("description")||"").trim();
  const amount=Number(formData.get("amount_kes"));
  const payerEmail=String(formData.get("payer_email")||"").trim().toLowerCase();
  const sessionId=String(formData.get("session_id")||"").trim();
  const mode = process.env.PAYSTACK_MODE==="live"?"live":"test";
  if(!isPurposeAllowedForPaymentMode(purpose,mode))
    throw new Error("This payment purpose is not available for live Starter checkout.");
  if(!purposes.includes(purpose)||description.length<3||description.length>240)
    throw new Error("Enter the payment purpose and a clear description.");
  if(!Number.isSafeInteger(amount)||amount<3||amount>150000)
    throw new Error("Amount must be between KES 3 and KES 150,000.");
  if(payerEmail&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)||payerEmail.length>254))
    throw new Error("Enter a valid payer email or leave it blank for a shareable invoice.");
  if(sessionId){
    if(purpose!=="recording_session"||!uuid.test(sessionId))throw new Error("Invalid recording session.");
    const {data:session,error}=await admin.from("studio_sessions").select("id").eq("id",sessionId)
      .eq("project_id",project.id).maybeSingle();
    if(error||!session)throw new Error("Recording session is not part of this project.");
  }
  const {data:invoice,error}=await admin.from("project_payment_invoices").insert({
    project_id:project.id,session_id:sessionId||null,purpose,description,
    amount_kes:amount,payer_email:payerEmail||null,created_by:user.id
  }).select("public_token").single();
  if(error||!invoice)throw new Error("Could not create payment request. Is the payment migration installed?");
  redirect("/payments?created="+invoice.public_token);
}
