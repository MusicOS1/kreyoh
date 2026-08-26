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
  const nickname = value(formData, "nickname") || null;
  const phone = value(formData, "phone") || null;
  const bio = value(formData, "bio") || null;
  const location = value(formData, "location") || null;
  const skillsGenres = value(formData, "skills_genres").split(",").map(item => item.trim()).filter(Boolean);
  const socialUrl = value(formData, "social_url") || null;
  const streamingUrl = value(formData, "streaming_url") || null;
  const epkTagline = value(formData, "epk_tagline") || null;
  const interviewTitle = value(formData, "interview_title") || null;
  const interviewUrl = value(formData, "interview_url") || null;
  const achievements = value(formData, "achievements").split("\n").map(item => item.trim()).filter(Boolean).slice(0, 8);
  const topSongs = Array.from({ length: 5 }, (_, index) => ({
    title: value(formData, `song_${index + 1}_title`),
    url: value(formData, `song_${index + 1}_url`),
  })).filter(song => song.title);

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  const profileUpdate: Record<string, unknown> = {
    full_name: fullName,
    stage_name: stageName,
    nickname,
    phone,
    bio,
    location,
    skills_genres: skillsGenres,
    social_links: socialUrl ? { primary: socialUrl } : {},
    streaming_links: streamingUrl ? { primary: streamingUrl } : {},
    top_songs: topSongs,
    epk_tagline: epkTagline,
    interview_title: interviewTitle,
    interview_url: interviewUrl,
    achievements,
    updated_at: new Date().toISOString(),
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
  revalidatePath("/workspace");
  revalidatePath("/people");
  revalidatePath(`/people/${user.id}`);
  revalidatePath("/beats");
  revalidatePath("/tracks");
  revalidatePath("/studio-sessions");
}

export async function updateProfileMedia(formData: FormData): Promise<void> {
  const { admin, user } = await getWorkspace();
  let photos: string[] = [];
  try {
    const parsed = JSON.parse(value(formData, "photos"));
    photos = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && /^https?:\/\//i.test(item)).slice(0, 5) : [];
  } catch { throw new Error("The photo catalogue could not be read."); }
  const { data: currentProfile } = await admin.from("profiles").select("hero_image_url").eq("id", user.id).maybeSingle();
  const update: Record<string, unknown> = { photo_catalog: photos, updated_at: new Date().toISOString() };
  if (currentProfile?.hero_image_url && !photos.includes(currentProfile.hero_image_url)) update.hero_image_url = photos[0] || null;
  const { error } = await admin.from("profiles").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings"); revalidatePath("/people"); revalidatePath(`/people/${user.id}`);
}

export async function setProfileHeroImage(formData: FormData): Promise<void> {
  const { admin, user } = await getWorkspace();
  const heroImageUrl = value(formData, "hero_image_url");
  if (!heroImageUrl || !/^https?:\/\//i.test(heroImageUrl)) {
    throw new Error("Choose a valid catalogue image for your hero.");
  }
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("photo_catalog")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const catalogue = Array.isArray(profile?.photo_catalog) ? profile.photo_catalog : [];
  if (!catalogue.includes(heroImageUrl)) throw new Error("That image is not in your photo catalogue.");
  const { error } = await admin.from("profiles").update({ hero_image_url: heroImageUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/workspace");
  revalidatePath("/people");
  revalidatePath(`/people/${user.id}`);
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
  revalidatePath(`/people/${user.id}`);
  revalidatePath("/workspace");
  revalidatePath("/beats");
  revalidatePath("/tracks");
}
