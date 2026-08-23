"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";

const value = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function submitContact(data: FormData) {
  const name = value(data, "name");
  const email = value(data, "email").toLowerCase();
  const phone = value(data, "phone");
  const subject = value(data, "subject");
  const message = value(data, "message");
  if (!name || !email.includes("@") || !subject || message.length < 10) redirect("/contact?error=Please+complete+all+required+fields.");
  const { error } = await createAdminClient().from("public_enquiries").insert({ enquiry_type: "contact", name, email, phone: phone || null, subject, message });
  if (error) { console.error("FACKTS Music contact enquiry error:", error.message); redirect("/contact?error=Your+message+could+not+be+sent.+Please+try+again."); }
  redirect("/contact?success=Thank+you.+Your+message+has+reached+FACKTS+Music.");
}
