"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";

const value = (data: FormData, key: string) => String(data.get(key) || "").trim();

export async function submitPartnership(data: FormData) {
  const name=value(data,"name"), organisation=value(data,"organisation"), email=value(data,"email").toLowerCase(), phone=value(data,"phone"), partnership_type=value(data,"partnership_type"), message=value(data,"message");
  if (!name || !organisation || !email.includes("@") || !partnership_type || message.length < 20) redirect("/partner?error=Please+complete+all+required+fields.");
  const { error } = await createAdminClient().from("public_enquiries").insert({ enquiry_type:"partnership", name, organisation, email, phone:phone||null, partnership_type, subject:`Partnership: ${partnership_type}`, message });
  if (error) { console.error("FACKTS Music partnership enquiry error:",error.message); redirect("/partner?error=Your+proposal+could+not+be+sent.+Please+try+again."); }
  redirect("/partner?success=Thank+you.+FACKTS+Music+has+received+your+partnership+proposal.");
}
