import "server-only";
import { createHmac } from "node:crypto";

export type CrmIntakeEvent={
  event_id:string;
  event_type:"lead"|"commercial_opportunity";
  name:string;
  email?:string;
  organization?:string;
  phone?:string;
  interest?:string;
  message?:string;
  source_record_id?:string;
};

/**
 * Sends a minimal, explicitly approved event; does not expose Music OS
 * service-role credentials, creator profiles, finance or music rights data.
 */
export async function deliverMusicEnquiryToCrm(event:CrmIntakeEvent):Promise<string>{
  const origin=process.env.FACKTS_CRM_URL;
  const secret=process.env.FACKTS_CRM_WEBHOOK_SECRET;
  if(!origin||!secret||secret.length<32)throw new Error("Music OS CRM connection is not configured.");
  const url=new URL("/api/integrations/intake",origin);
  if(url.protocol!=="https:")throw new Error("Music OS CRM connection requires HTTPS.");
  const body=JSON.stringify(event);
  const timestamp=String(Date.now());
  const signature=createHmac("sha256",secret)
    .update("music_os."+timestamp+"."+body)
    .digest("hex");

  const response=await fetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Fackts-Source":"music_os",
      "X-Fackts-Timestamp":timestamp,
      "X-Fackts-Signature":signature
    },
    body,cache:"no-store",signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error("CRM intake returned HTTP "+response.status);
  const receipt=await response.json() as {ok?:boolean;receipt_id?:string};
  if(receipt.ok!==true||!receipt.receipt_id)throw new Error("CRM intake did not confirm receipt.");
  return receipt.receipt_id;
}

export async function tryDeliverMusicEnquiryToCrm(event:CrmIntakeEvent):Promise<boolean>{
  try{
    await deliverMusicEnquiryToCrm(event);
    return true;
  }catch(error){
    // Existing Music OS records remain intact if the separate CRM is unavailable.
    // Never print the shared secret, contact payload or personal information.
    console.error("[music-crm] Intake failed",error instanceof Error?error.message:"unknown failure");
    return false;
  }
}
