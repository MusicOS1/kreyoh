"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect(`/login?error=${encodeURIComponent("Enter your email and password.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect(`/login?error=${encodeURIComponent(error?.message || "Sign in failed.")}`);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("profiles").update({ last_login_at: now, last_active_at: now }).eq("id", data.user.id),
    admin.from("auth_events").insert({ user_id: data.user.id, event_name: "login_completed", metadata: { surface: "main" } }),
  ]);
  revalidatePath("/", "layout");
  redirect("/home");
}
