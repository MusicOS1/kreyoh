"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../lib/supabase/admin";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import {
  assertR2BucketAccess,
  assertR2ObjectAccess,
  createR2PresignedUrl,
  isR2Configured,
} from "../../lib/r2";

const read = (formData: FormData, key: string) =>
  String(formData.get(key) || "").trim();

const trackFileRoles = ["Super Admin", "Project Lead", "A&R", "Producer", "Engineer"];
const trackCreateRoles = ["Super Admin", "Project Lead", "A&R"];
const trackAssetKinds = ["demo", "rough_mix", "mix", "master", "stems", "reference"];
const trackStatuses = ["in_development", "revision", "in_studio", "mixing", "mastering", "release_ready", "complete"];
const trackCreditRoles = new Set([
  "artist",
  "featured_artist",
  "producer",
  "songwriter",
  "engineer",
  "mix_engineer",
  "mastering_engineer",
  "vocalist",
  "instrumentalist",
  "a&r",
  "manager",
  "visual_creative",
  "other",
]);

async function requireTrackCreationAccess() {
  const workspace = await getWorkspace();
  if (!workspace.project || !workspace.membership) {
    throw new Error("Project access required.");
  }
  if (!hasAnyRole(workspace.roles, trackCreateRoles)) {
    throw new Error("Only Project Lead, A&R or Super Admin can register a new track.");
  }
  return workspace;
}

async function requireTrackAccess(trackId: string) {
  const workspace = await getWorkspace();
  if (!workspace.project || !workspace.membership) {
    throw new Error("Project access required.");
  }
  if (!hasAnyRole(workspace.roles, trackFileRoles)) {
    throw new Error("Your project role cannot manage track files.");
  }

  const { data: track, error } = await workspace.admin
    .from("tracks")
    .select("id,project_id,working_title")
    .eq("id", trackId)
    .eq("project_id", workspace.project.id)
    .maybeSingle();

  if (error || !track) {
    throw new Error("That track is not available in this project.");
  }

  return { ...workspace, track };
}

export async function prepareTrackIntake(formData: FormData) {
  const { admin, project, user } = await requireTrackCreationAccess();
  const workingTitle = read(formData, "working_title");
  const beatId = read(formData, "beat_id") || null;
  const developmentStatus = read(formData, "development_status") || "in_development";
  const assetKind = read(formData, "asset_kind") || "demo";
  const fileName = read(formData, "file_name");
  const mimeType = read(formData, "file_type") || "application/octet-stream";
  const fileSize = Number(read(formData, "file_size"));

  if (!workingTitle) throw new Error("Give the track a working title.");
  if (!trackStatuses.includes(developmentStatus)) throw new Error("Choose a valid track stage.");
  if (!trackAssetKinds.includes(assetKind) || assetKind === "stems") {
    throw new Error("Choose a valid audio version type.");
  }
  if (!isR2Configured()) throw new Error("Cloudflare R2 is not configured for track files yet.");
  if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Choose a valid track audio file.");
  }
  if (fileSize > 250 * 1024 * 1024) throw new Error("Track files must be smaller than 250 MB.");
  if (!mimeType.startsWith("audio/")) throw new Error("Upload an audio file for the new track.");

  let linkedBeat: { id: string; producer_user_id: string | null } | null = null;
  if (beatId) {
    const [{ data: beat, error: beatError }, { data: existingTrack, error: existingError }] = await Promise.all([
      admin
        .from("beats")
        .select("id,producer_user_id")
        .eq("id", beatId)
        .eq("project_id", project.id)
        .maybeSingle(),
      admin
        .from("tracks")
        .select("id")
        .eq("beat_id", beatId)
        .eq("project_id", project.id)
        .maybeSingle(),
    ]);
    if (beatError) throw new Error(beatError.message);
    if (!beat) throw new Error("The selected beat is not available in this project.");
    if (existingError) throw new Error(existingError.message);
    if (existingTrack) throw new Error("The selected beat is already connected to another track.");
    linkedBeat = beat;
  }

  const creditUserIds = formData.getAll("credit_user_id").map(String);
  const creditRoleValues = formData.getAll("credit_role").map(String);
  const credits = creditUserIds
    .map((userId, index) => ({
      user_id: userId.trim(),
      contribution_role: (creditRoleValues[index] || "artist").trim().toLowerCase(),
    }))
    .filter((credit) => credit.user_id && trackCreditRoles.has(credit.contribution_role));

  if (linkedBeat?.producer_user_id) {
    credits.push({
      user_id: linkedBeat.producer_user_id,
      contribution_role: "producer",
    });
  }

  const uniqueCredits = Array.from(
    new Map(credits.map((credit) => [`${credit.user_id}:${credit.contribution_role}`, credit])).values()
  );
  if (!uniqueCredits.length) throw new Error("Add at least one person to the track credits.");

  const requestedMemberIds = Array.from(new Set(uniqueCredits.map((credit) => credit.user_id)));
  const { data: activeMembers, error: membersError } = await admin
    .from("project_members")
    .select("user_id")
    .eq("project_id", project.id)
    .eq("status", "active")
    .in("user_id", requestedMemberIds);
  if (membersError) throw new Error(membersError.message);
  const allowedMemberIds = new Set((activeMembers ?? []).map((member) => member.user_id));
  if (requestedMemberIds.some((id) => !allowedMemberIds.has(id))) {
    throw new Error("Every credited person must be an active member of this project.");
  }

  await assertR2BucketAccess();
  const trackId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageKey = `${project.id}/tracks/${trackId}/${crypto.randomUUID()}-${safeName}`;
  const uploadUrl = await createR2PresignedUrl("PUT", storageKey, 900, mimeType);
  const requestedCode = read(formData, "track_code").toUpperCase();
  const trackCode = requestedCode || `TRACK-${Date.now().toString().slice(-5)}`;

  const { error: trackError } = await admin.from("tracks").insert({
    id: trackId,
    project_id: project.id,
    beat_id: beatId,
    track_code: trackCode,
    working_title: workingTitle,
    status: developmentStatus,
    development_status: developmentStatus,
    created_by: user.id,
  });
  if (trackError) throw new Error(trackError.message);

  const { error: creditsError } = await admin.from("track_contributors").insert(
    uniqueCredits.map((credit) => ({
      track_id: trackId,
      user_id: credit.user_id,
      contribution_role: credit.contribution_role,
    }))
  );
  if (creditsError) {
    await admin.from("tracks").delete().eq("id", trackId).eq("project_id", project.id);
    throw new Error(`The track credits could not be recorded: ${creditsError.message}`);
  }

  await admin.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action: `registered ${workingTitle} with ${uniqueCredits.length} credit${uniqueCredits.length === 1 ? "" : "s"}`,
    entity_type: "track",
    entity_id: trackId,
  });

  return { trackId, storageKey, uploadUrl };
}

export async function discardTrackIntake(trackId: string) {
  const { admin, project, user } = await requireTrackCreationAccess();
  const { count } = await admin
    .from("project_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("entity_type", "track")
    .eq("entity_id", trackId);
  if ((count ?? 0) > 0) return;
  await admin
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("project_id", project.id)
    .eq("created_by", user.id);
}

export async function prepareTrackUpload(formData: FormData) {
  const trackId = read(formData, "track_id");
  const fileName = read(formData, "file_name");
  const mimeType = read(formData, "file_type") || "application/octet-stream";
  const fileSize = Number(read(formData, "file_size"));
  const assetKind = read(formData, "asset_kind") || "demo";

  const { project } = await requireTrackAccess(trackId);
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured for track files yet.");
  }
  if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Choose a valid track file.");
  }
  if (fileSize > 250 * 1024 * 1024) {
    throw new Error("Track files must be smaller than 250 MB.");
  }
  if (!mimeType.startsWith("audio/") && !fileName.toLowerCase().endsWith(".zip")) {
    throw new Error("Upload an audio file, or a ZIP archive for stems.");
  }
  if (!trackAssetKinds.includes(assetKind)) {
    throw new Error("Choose a valid track file type.");
  }

  await assertR2BucketAccess();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageKey = `${project.id}/tracks/${trackId}/${crypto.randomUUID()}-${safeName}`;

  return {
    storageKey,
    uploadUrl: await createR2PresignedUrl("PUT", storageKey, 900, mimeType),
  };
}

export async function saveTrackAsset(formData: FormData) {
  const trackId = read(formData, "track_id");
  const storageKey = read(formData, "storage_key");
  const fileName = read(formData, "file_name");
  const mimeType = read(formData, "mime_type") || null;
  const assetKind = read(formData, "asset_kind") || "demo";
  const { project, user, track } = await requireTrackAccess(trackId);

  if (!storageKey || !fileName) {
    throw new Error("The track file transfer is incomplete.");
  }
  if (!trackAssetKinds.includes(assetKind)) {
    throw new Error("Choose a valid track file type.");
  }

  await assertR2ObjectAccess(storageKey);
  const admin = createAdminClient();
  const { data: asset, error } = await admin
    .from("project_assets")
    .insert({
      project_id: project.id,
      entity_type: "track",
      entity_id: track.id,
      uploaded_by: user.id,
      bucket_id: "r2",
      storage_path: storageKey,
      file_name: fileName,
      mime_type: mimeType,
      asset_kind: assetKind,
      visibility: "project",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`The track file was transferred but could not be registered: ${error.message}`);
  }

  await admin.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action: `uploaded ${assetKind.replaceAll("_", " ")} for ${track.working_title || "a track"}`,
    entity_type: "track",
    entity_id: track.id,
  });
  await admin.from("platform_events").insert({
    user_id: user.id,
    project_id: project.id,
    event_name: "track_file_uploaded",
    category: "music",
    entity_type: "asset",
    entity_id: asset!.id,
    metadata: { track_id: track.id, asset_kind: assetKind, storage_provider: "r2" },
  });

  revalidatePath("/tracks");
  revalidatePath("/workspace");
  return { ok: true, message: "Track file added to the version history." };
}

export async function updateTrack(formData: FormData) {
  const { supabase, project, roles } = await getWorkspace();
  if (!project || !hasAnyRole(roles, trackFileRoles)) {
    throw new Error("Your role cannot update track development.");
  }
  const status = read(formData, "status");
  if (!trackStatuses.includes(status)) {
    throw new Error("Invalid track status.");
  }
  const { error } = await supabase
    .from("tracks")
    .update({ development_status: status, status, updated_at: new Date().toISOString() })
    .eq("id", read(formData, "track_id"))
    .eq("project_id", project.id);
  if (error) throw new Error(error.message);
  revalidatePath("/tracks");
}

export async function commentOnTrack(formData: FormData) {
  const { supabase, user, project, membership, roles } = await getWorkspace();
  if (!project || !membership) throw new Error("Project access required.");
  const body = read(formData, "comment");
  if (!body) return;
  const kind = roles.includes("A&R") ? "ar_note" : "comment";
  const { error } = await supabase.from("comments").insert({
    project_id: project.id,
    entity_type: "track",
    entity_id: read(formData, "track_id"),
    user_id: user.id,
    kind,
    body,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/tracks");
}
