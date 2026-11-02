"use server";

import { safeNext } from "../../lib/navigation";
import {isFanProfile} from "../../lib/fanProfile";
import {cleanPublicName,validatePublicName} from "../../lib/publicName";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";

const PUBLIC_TYPES: Record<string, string[]> = {
  "Fan / Listener": ["Fan"],
  Artist: ["Artist"],
  Producer: ["Producer"],
  "Artist + Producer": ["Artist", "Producer"],
  "Songwriter / Composer": ["Songwriter", "Composer"],
  "Engineer / Technical": ["Engineer"],

  "A&R": ["A&R"],
  "Artist Manager": ["Manager"],
  "Studio Owner": ["Studio Owner"],

  "Videographer / Photographer": ["Videographer", "Photographer"],
  "Designer / Visual Creative": ["Designer", "Visual Creative"],
  "Content / Media": ["Content", "Media"],
  "Session Musician": ["Session Musician"],
  "Other Creative": ["Other Creative"],
};

const read = (formData: FormData, key: string) =>
  String(formData.get(key) || "").trim();

export async function signup(formData: FormData) {
  const next = safeNext(read(formData,"next"), "/home");
  const fullName = read(formData, "full_name");
  const publicName=cleanPublicName(read(formData,"public_name"));
  const email = read(formData, "email").toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");
  const path = read(formData,"account_path");
  const typeLabel = path==="fan"?"Fan / Listener":read(formData,"creator_type");
  const creatorTypes = PUBLIC_TYPES[typeLabel];
  const accepted = formData.get("accepted_terms") === "on";
  const otherCreativeType=read(formData,"other_creative_type").replace(/\s+/g," ").slice(0,80);

  const fail = (message: string): never =>
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);

  if (!["fan","creative"].includes(path) || (path==="creative"&&!read(formData,"creator_type")) || (path==="creative"&&typeLabel==="Fan / Listener") || !fullName || !email || !password || !creatorTypes) {
    fail("Complete every required field.");
  }

  const publicNameError=validatePublicName(publicName);
  if(publicNameError)fail(publicNameError);
  if(path==="creative"&&typeLabel==="Other Creative"&&(!otherCreativeType||otherCreativeType.length<2))fail("Tell us what kind of creative you are.");
  if (!accepted) {
    fail("Accept the terms and privacy notice to continue.");
  }

  if (password.length < 8) {
    fail("Use a password with at least 8 characters.");
  }

  if (password !== confirm) {
    fail("The passwords do not match.");
  }

  const admin=createAdminClient();
  const {data:nameAvailable,error:nameLookupError}=await admin.rpc("fackts_public_name_available",{
    candidate:publicName,excluded_profile_id:null
  });
  if(nameLookupError)fail("Public name registration is temporarily unavailable. Please try again.");
  if(!nameAvailable)fail("That public name is already registered. Choose a different name.");

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(path==="fan"&&next==="/home"?"/fan":next)}`,
      data: {
        full_name: fullName,
        public_name:publicName,
        creator_types: creatorTypes,
        account_path:path,
        creative_role: creatorTypes[0],
        ...(typeLabel==="Other Creative"?{other_creative_type:otherCreativeType}:{}),
      },
    },
  });

  const authUser = data.user;

  if (error) fail(error.message);

  if (!authUser) {
    return fail("FACKTS Music could not create this account.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: authUser.id,
      full_name: fullName,
      public_name:publicName,
      ...(path==="creative"?{stage_name:publicName}:{nickname:publicName}),
      email,
      creator_types: creatorTypes,
      ...(typeLabel==="Other Creative"?{skills_genres:[otherCreativeType]}:{}),
      profile_visibility: "project",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    if(profileError.code==="23505"||/public.name.*(registered|unique|duplicate)/i.test(profileError.message))
      fail("That public name was just claimed. Your login account may have been created; sign in and choose another public name in Settings.");
    fail("Your account was created but your public profile needs attention. Please sign in and complete it in Settings.");
  }

  await admin.from("auth_events").insert({
    user_id: authUser.id,
    event_name: "signup_completed",
    metadata: {
      creator_types: creatorTypes,
      signup_identity: typeLabel,
      public_name:publicName,
      signup_path:path,
      ...(typeLabel==="Other Creative"?{other_creative_type:otherCreativeType}:{}),
    },
  });

  // Signup identity describes the person.
  // Project access/permissions are still activated separately through
  // project membership and invitations.
  if (data.session) {
    redirect(next==="/home"&&isFanProfile({creator_types:creatorTypes})?"/fan":next);
  }

  redirect(
    `/signup?next=${encodeURIComponent(next)}&success=${encodeURIComponent(
      "Account created. Check your email to confirm access, then sign in.",
    )}`,
  );
}
