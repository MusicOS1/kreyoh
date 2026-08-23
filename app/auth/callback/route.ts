import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/workspace";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Confirmation link is incomplete. Please request a new one.")}`, url.origin));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message || "Confirmation failed.")}`, url.origin));

  const admin = createAdminClient();
  const metadata = data.user.user_metadata || {};
  await admin.from("profiles").upsert({
    id: data.user.id,
    email: data.user.email,
    full_name: metadata.full_name || data.user.email?.split("@")[0],
    creator_types: metadata.creator_types || [metadata.creative_role || "Other Creative"],
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  await admin.from("auth_events").insert({ user_id: data.user.id, event_name: "confirmation_completed", metadata: { next } });
  return NextResponse.redirect(new URL(next, url.origin));
}
