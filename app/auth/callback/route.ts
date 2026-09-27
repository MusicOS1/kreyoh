import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

import { safeNext } from "../../../lib/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (!code && !(tokenHash && ["signup", "invite", "recovery", "email"].includes(type || ""))) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Confirmation link is incomplete. Please request a new one.")}`, url.origin));

  const supabase = await createClient();
  const { data, error } = code ? await supabase.auth.exchangeCodeForSession(code) : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as "signup" | "invite" | "recovery" | "email" });
  if (error || !data.user) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || "Confirmation failed.")}`, url.origin));

  const admin = createAdminClient();
  const metadata = data.user.user_metadata || {};
  const { data: existing } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!existing) await admin.from("profiles").upsert({
    id: data.user.id,
    email: data.user.email,
    full_name: metadata.full_name || data.user.email?.split("@")[0],
    creator_types: metadata.creator_types || [metadata.creative_role || "Other Creative"],
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  await admin.from("auth_events").insert({ user_id: data.user.id, event_name: "confirmation_completed", metadata: { next } });
  return NextResponse.redirect(new URL(next, url.origin));
}
