"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "../../lib/supabase/admin";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { assertR2BucketAccess, createR2PresignedUrl, isR2Configured, r2PublicUrl } from "../../lib/r2";

const read = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const go = (kind: "message" | "error", message: string): never => redirect(`/beats?${kind}=${encodeURIComponent(message)}`);

export async function prepareR2BeatUpload(formData: FormData) {
  const { project, roles, membership } = await getWorkspace();
  if (!project || !membership) throw new Error("You need active project access.");
  if (!hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R", "Producer"])) throw new Error("Your project role cannot upload beats.");
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured yet. Add the R2 server variables before direct uploads.");
  const name = read(formData, "file_name");
  const mime = read(formData, "file_type");
  const size = Number(read(formData, "file_size"));
  if (!name || !mime.startsWith("audio/") || !Number.isFinite(size) || size <= 0) throw new Error("Choose a valid audio file.");
  if (size > 100 * 1024 * 1024) throw new Error("Audio files must be smaller than 100 MB.");
  await assertR2BucketAccess();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageKey = `${project.id}/${crypto.randomUUID()}-${safeName}`;
  return { storageKey, uploadUrl: await createR2PresignedUrl("PUT", storageKey, 900, mime), playbackUrl: r2PublicUrl(storageKey) };
}

export async function addBeat(formData: FormData) {
  const { supabase, user, project, roles, membership } = await getWorkspace();
  if (!project || !membership) go("error", "You need active project access.");
  if (!hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R", "Producer"])) go("error", "Your project role cannot upload beats.");

  const title = read(formData, "title");
  if (!title) go("error", "Give the beat a title.");
  const storageProvider = read(formData, "storage_provider");
  const storageKey = read(formData, "storage_key");
  const playbackUrl = read(formData, "playback_url");
  const audio = formData.get("audio_file");
  let audioPath: string | null = null;
  if (!storageKey && audio instanceof File && audio.size > 0) {
    if (audio.size > 100 * 1024 * 1024) go("error", "Audio files must be smaller than 100 MB.");
    if (!audio.type.startsWith("audio/")) go("error", "Choose a valid audio file.");
    const safeName = audio.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    audioPath = `${project.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("beat-audio").upload(audioPath, audio, { contentType: audio.type, upsert: false });
    if (error) go("error", `Audio upload failed: ${error.message}`);
  }

  const genreTags = read(formData, "genre_tags").split(",").map(v => v.trim()).filter(Boolean);
  const moodTags = read(formData, "mood_tags").split(",").map(v => v.trim()).filter(Boolean);
  const { data: beat, error } = await supabase.from("beats").insert({
    project_id: project.id,
    beat_code: read(formData, "beat_code") || `BEAT-${Date.now().toString().slice(-6)}`,
    title,
    producer_name: read(formData, "producer_name") || null,
    producer_user_id: roles.includes("Producer") ? user.id : null,
    source_provider: read(formData, "source_type") || "Supabase",
    source_type: read(formData, "source_type") || (audioPath ? "supabase" : "external"),
    external_source_id: read(formData, "external_source_id") || null,
    external_url: read(formData, "external_url") || null,
    sync_status: read(formData, "sync_status") || "manual",
    audio_path: audioPath,
    storage_provider: storageProvider || (audioPath ? "supabase" : "external"),
    storage_key: storageKey || audioPath,
    playback_url: playbackUrl || null,
    file_name: read(formData, "file_name") || (audio instanceof File ? audio.name : null),
    file_size: Number(read(formData, "file_size")) || (audio instanceof File ? audio.size : null),
    mime_type: read(formData, "mime_type") || (audio instanceof File ? audio.type : null),
    artwork_url: read(formData, "artwork_url") || null,
    bpm: Number(read(formData, "bpm")) || null,
    musical_key: read(formData, "musical_key") || null,
    genre_tags: genreTags,
    mood_tags: moodTags,
    description: read(formData, "description") || null,
    artist_capacity: Number(read(formData, "artist_capacity")) || project.default_beat_capacity || 3,
    status: "available",
    created_by: user.id,
  }).select("id").single();
  if (error) {
    if (audioPath) await supabase.storage.from("beat-audio").remove([audioPath]);
    go("error", error.message);
  }
  await supabase.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `added ${title} to the Beat Library`, entity_type: "beat", entity_id: beat!.id });
  await createAdminClient().from("platform_events").insert({ user_id: user.id, project_id: project.id, event_name: "beat_uploaded", category: "music", entity_type: "beat", entity_id: beat!.id, metadata: { storage_provider: storageProvider || (audioPath ? "supabase" : "external") } });
  revalidatePath("/beats"); revalidatePath("/workspace");
  go("message", "Beat added to the library.");
}

export async function claimBeat(formData: FormData) {
  const { supabase, user, project } = await getWorkspace();
  const beatId = read(formData, "beat_id");
  const { error } = await supabase.rpc("claim_beat", { target_beat: beatId, claim_notes: null });
  if (error) go("error", error.message);
  await createAdminClient().from("platform_events").insert({ user_id: user.id, project_id: project?.id, event_name: "beat_claimed", category: "music", entity_type: "beat", entity_id: beatId });
  revalidatePath("/beats"); revalidatePath("/workspace");
  go("message", "Your development slot is confirmed.");
}

export async function releaseClaim(formData: FormData) {
  const { supabase, user, project } = await getWorkspace();
  const beatId = read(formData, "beat_id");
  const { error } = await supabase.rpc("release_beat_claim", { target_beat: beatId });
  if (error) go("error", error.message);
  await createAdminClient().from("platform_events").insert({ user_id: user.id, project_id: project?.id, event_name: "beat_claim_released", category: "music", entity_type: "beat", entity_id: beatId });
  revalidatePath("/beats"); revalidatePath("/workspace");
  go("message", "Your claim was released.");
}

export async function leaveIdea(formData: FormData) {
  const { supabase, user, project, membership } = await getWorkspace();
  if (!project || !membership) go("error", "You need active project access.");
  const body = read(formData, "idea");
  if (!body) go("error", "Write your idea first.");
  const beatId = read(formData, "beat_id");
  const { error } = await supabase.from("comments").insert({ project_id: project.id, entity_type: "beat", entity_id: beatId, user_id: user.id, kind: "idea", body });
  if (error) go("error", error.message);
  await createAdminClient().from("platform_events").insert({ user_id: user.id, project_id: project.id, event_name: "beat_idea_submitted", category: "collaboration", entity_type: "beat", entity_id: beatId });
  revalidatePath("/beats");
  go("message", "Your idea is now visible to A&R and the Project Lead.");
}

export async function manageClaim(formData: FormData) {
  const { user, project, roles } = await getWorkspace();
  if (!project || !hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R"])) go("error", "Only Project Lead or A&R can manage claims.");
  const claimId = read(formData, "claim_id");
  const status = read(formData, "status");
  const reason = read(formData, "reason");
  if (!["confirmed", "removed"].includes(status)) go("error", "Invalid claim update.");
  if (status === "removed" && !reason) go("error", "Record a reason for removing the claim.");
  const admin = createAdminClient();
  const { data: claim, error } = await admin.from("beat_claims").update({ status, removed_by: status === "removed" ? user.id : null, override_reason: reason || null, updated_at: new Date().toISOString() }).eq("id", claimId).eq("project_id", project.id).select("beat_id").single();
  if (error) go("error", error.message);
  await admin.from("activity_log").insert({ project_id: project.id, user_id: user.id, action: `${status} a beat claim${reason ? `: ${reason}` : ""}`, entity_type: "beat", entity_id: claim!.beat_id });
  revalidatePath("/beats");
  go("message", "Claim updated and recorded in activity history.");
}

export async function convertToTrack(formData: FormData) {
  const { user, project, roles } = await getWorkspace();
  if (!project || !hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R"])) go("error", "Only Project Lead or A&R can start track development.");
  const beatId = read(formData, "beat_id");
  const title = read(formData, "title") || "Untitled track";
  const admin = createAdminClient();
  const existing = await admin.from("tracks").select("id").eq("beat_id", beatId).maybeSingle();
  if (existing.data) go("error", "This beat is already linked to a track.");
  const { data: track, error } = await admin.from("tracks").insert({ project_id: project.id, beat_id: beatId, track_code: `TRACK-${Date.now().toString().slice(-5)}`, working_title: title, status: "in_development", development_status: "in_development", created_by: user.id }).select("id").single();
  if (error) go("error", error.message);
  const claims = await admin.from("beat_claims").select("artist_id").eq("beat_id", beatId).in("status", ["claimed", "confirmed"]);
  if (claims.data?.length) await admin.from("track_contributors").insert(claims.data.map(row => ({ track_id: track!.id, user_id: row.artist_id, contribution_role: "artist" })));
  await admin.from("beat_claims").update({ status: "converted_to_track" }).eq("beat_id", beatId).in("status", ["claimed", "confirmed"]);
  await admin.from("beats").update({ status: "in development" }).eq("id", beatId);
  revalidatePath("/beats"); revalidatePath("/tracks");
  go("message", "Track development started.");
}
