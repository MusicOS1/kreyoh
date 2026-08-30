"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

const PUBLIC_TYPES: Record<string, string[]> = {
  Artist: ["Artist"],
  Producer: ["Producer"],
  "Artist + Producer": ["Artist", "Producer"],
  "Songwriter / Composer": ["Songwriter", "Composer"],
  "Engineer / Technical": ["Engineer"],
  Manager: ["Manager"],
  "Videographer / Photographer": ["Videographer", "Photographer"],
  "Designer / Visual Creative": ["Designer", "Visual Creative"],
  "Content / Media": ["Content", "Media"],
  "Session Musician": ["Session Musician"],
  "Other Creative": ["Other Creative"],
};

const read = (formData: FormData, key: string) => String(formData.get(key) || "").trim();

export async function signup(formData: FormData) {
  const fullName = read(formData, "full_name");
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");
  const typeLabel = read(formData, "creator_type");
  const creatorTypes = PUBLIC_TYPES[typeLabel];
  const accepted = formData.get("accepted_terms") === "on";

  const fail = (message: string): never => redirect(`/signup?error=${encodeURIComponent(message)}`);
  if (!fullName || !email || !password || !creatorTypes) fail("Complete every required field.");
  if (!accepted) fail("Accept the terms and privacy notice to continue.");
  if (password.length < 8) fail("Use a password with at least 8 characters.");
  if (password !== confirm) fail("The passwords do not match.");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/home`,
      data: { full_name: fullName, creator_types: creatorTypes, creative_role: creatorTypes[0] },
    },
  });

  const authUser = data.user;
  if (error) fail(error.message);
  if (!authUser) return fail("FACKTS Music could not create this account.");

  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").upsert({
    id: authUser.id,
    full_name: fullName,
    email,
    creator_types: creatorTypes,
    profile_visibility: "project",
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (profileError) fail("Your account was created, but the creator profile could not be prepared. Please sign in again.");

  await admin.from("auth_events").insert({
    user_id: authUser.id,
    event_name: "signup_completed",
    metadata: { creator_types: creatorTypes },
  });

  // When Confirm Email is disabled Supabase returns a real session immediately.
  // Keep it and enter the role-aware app. Otherwise provide an honest instruction.
  if (data.session) redirect("/home");
  redirect(`/signup?success=${encodeURIComponent("Account created. Check your email to confirm access, then sign in.")}`);
}
