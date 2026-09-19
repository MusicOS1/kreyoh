"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";
import { tryDeliverMusicEnquiryToCrm } from "../../lib/facktsCrm";

const value = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function submitPartnership(data: FormData) {
  const name=value(data,"name"), organisation=value(data,"organisation"), email=value(data,"email").toLowerCase(), phone=value(data,"phone"), partnership_type=value(data,"partnership_type"), message=value(data,"message");
  if (!name || !organisation || !email.includes("@") || !partnership_type || message.length < 20) redirect("/partner?error=Please+complete+all+required+fields.");
  const { data: enquiry, error } = await createAdminClient().from("public_enquiries").insert({ enquiry_type:"partnership", name, organisation, email, phone:phone||null, partnership_type, subject:`Partnership: ${partnership_type}`, message }).select("id").single();
  if (error || !enquiry?.id) { console.error("FACKTS Music partnership enquiry error:",error?.message || "No enquiry receipt"); redirect("/partner?error=Your+proposal+could+not+be+sent.+Please+try+again."); }
  const crmReceived=await tryDeliverMusicEnquiryToCrm({
    event_id:enquiry.id,event_type:"lead",name,email,phone,organization:organisation,
    interest:"Music partnership: "+partnership_type,message,source_record_id:enquiry.id
  });
  redirect(crmReceived
    ? "/partner?success=Thank+you.+FACKTS+Music+and+the+FACKTS+CRM+have+received+your+proposal."
    : "/partner?success=Thank+you.+FACKTS+Music+has+received+your+proposal.+The+CRM+sync+is+pending.");

}
