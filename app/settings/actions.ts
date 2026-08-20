"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";

function value(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

export async function updateProfile(formData: FormData): Promise<void> {
  const { supabase, user } = await getWorkspace();
  const fullName = value(formData, "full_name");
  const stageName = value(formData, "stage_name") || null;
  const phone = value(formData, "phone") || null;

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  const profileUpdate: Record<string, string | null> = {
    full_name: fullName,
    stage_name: stageName,
    phone,
  };

  // Preserve an existing photo when the profile form is submitted without the
  // upload control. The photo flow updates this field separately.
  if (formData.has("avatar_url")) {
    profileUpdate.avatar_url = value(formData, "avatar_url") || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateProfilePhoto(formData: FormData): Promise<void> {
  const { supabase, user } = await getWorkspace();
  const avatarUrl = value(formData, "avatar_url");

  if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) {
    throw new Error("A valid profile photo URL is required.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/settings");
}
