"use server";

import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import { createAdminClient } from "../lib/supabase/admin";

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    await Promise.all([
      admin.from("profiles").update({ last_logout_at: now }).eq("id", user.id),
      admin.from("auth_events").insert({ user_id: user.id, event_name: "logout_completed", metadata: { surface: "main" } }),
      admin.from("user_presence").update({ status: "offline", updated_at: now }).eq("user_id", user.id),
    ]);
  }
  await supabase.auth.signOut();

  redirect("/login");
}
