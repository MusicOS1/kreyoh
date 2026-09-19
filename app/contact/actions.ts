"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";
import { tryDeliverMusicEnquiryToCrm } from "../../lib/facktsCrm";

const value = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function submitContact(data: FormData) {
  const name = value(data, "name");
  const email = value(data, "email").toLowerCase();
  const phone = value(data, "phone");
  const subject = value(data, "subject");
  const message = value(data, "message");
  if (!name || !email.includes("@") || !subject || message.length < 10) redirect("/contact?error=Please+complete+all+required+fields.");
  const { data: enquiry, error } = await createAdminClient().from("public_enquiries").insert({ enquiry_type: "contact", name, email, phone: phone || null, subject, message }).select("id").single();
  if (error || !enquiry?.id) { console.error("FACKTS Music contact enquiry error:", error?.message || "No enquiry receipt"); redirect("/contact?error=Your+message+could+not+be+sent.+Please+try+again."); }
  const crmReceived=await tryDeliverMusicEnquiryToCrm({
    event_id:enquiry.id,event_type:"lead",name,email,phone,
    interest:"Music OS contact: "+subject,message,source_record_id:enquiry.id
  });
  redirect(crmReceived
    ? "/contact?success=Thank+you.+Your+message+has+reached+FACKTS+Music+and+the+FACKTS+CRM."
    : "/contact?success=Thank+you.+Your+message+has+reached+FACKTS+Music.+The+CRM+sync+is+pending.");

}
