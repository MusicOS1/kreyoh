"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import {
  assertR2BucketAccess,
  assertR2ObjectAccess,
  createR2PresignedUrl,
  isR2Configured,
} from "../../lib/r2";

const read = (formData: FormData, key: string) =>
  String(formData.get(key) || "").trim();

const createRoles = ["Super Admin", "Admin", "Project Lead", "A&R"];
const creditRoles = new Set([
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

const statuses = [
  "in_development",
  "revision",
  "in_studio",
  "mixing",
  "mastering",
  "release_ready",
  "complete",
];

const assetKinds = [
  "demo",
  "rough_mix",
  "mix",
  "master",
  "reference",
];

async function requireCreateAccess() {
  const workspace = await getWorkspace();

  if (!workspace.project || !workspace.membership) {
    throw new Error("Project access required.");
  }

  if (!hasAnyRole(workspace.roles, createRoles)) {
    throw new Error(
      "Only project leadership can register or replace a track.",
    );
  }

  return workspace;
}

export async function getReusableBeatOptions() {
  const { admin, project } = await requireCreateAccess();

  const { data, error } = await admin
    .from("beats")
    .select(
      "id,title,beat_code,producer_name,producer_user_id,status",
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function prepareReusableTrackIntake(
  formData: FormData,
) {
  const { admin, project, user } =
    await requireCreateAccess();

  const workingTitle = read(
    formData,
    "working_title",
  );
  const beatId =
    read(formData, "beat_id") || null;
  const developmentStatus =
    read(formData, "development_status") ||
    "in_development";
  const assetKind =
    read(formData, "asset_kind") || "demo";
  const fileName = read(
    formData,
    "file_name",
  );
  const mimeType =
    read(formData, "file_type") ||
    "application/octet-stream";
  const fileSize = Number(
    read(formData, "file_size"),
  );

  if (!workingTitle) {
    throw new Error(
      "Give the track a working title.",
    );
  }

  if (!statuses.includes(developmentStatus)) {
    throw new Error(
      "Choose a valid track stage.",
    );
  }

  if (!assetKinds.includes(assetKind)) {
    throw new Error(
      "Choose a valid audio version type.",
    );
  }

  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured for track files yet.",
    );
  }

  if (
    !fileName ||
    !Number.isFinite(fileSize) ||
    fileSize <= 0
  ) {
    throw new Error(
      "Choose a valid track audio file.",
    );
  }

  if (fileSize > 250 * 1024 * 1024) {
    throw new Error(
      "Track files must be smaller than 250 MB.",
    );
  }

  if (!mimeType.startsWith("audio/")) {
    throw new Error(
      "Upload an audio file for the new track.",
    );
  }

  let linkedBeat: {
    id: string;
    producer_user_id: string | null;
  } | null = null;

  if (beatId) {
    const { data: beat, error } = await admin
      .from("beats")
      .select("id,producer_user_id")
      .eq("id", beatId)
      .eq("project_id", project.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!beat) {
      throw new Error(
        "The selected beat is not available in this project.",
      );
    }

    // Deliberately no "existing track" check.
    // A beat can create multiple songs/versions.
    linkedBeat = beat;
  }

  const userIds = formData
    .getAll("credit_user_id")
    .map(String);

  const roleValues = formData
    .getAll("credit_role")
    .map(String);

  const credits = userIds
    .map((userId, index) => ({
      user_id: userId.trim(),
      contribution_role: (
        roleValues[index] || "artist"
      )
        .trim()
        .toLowerCase(),
    }))
    .filter(
      (credit) =>
        credit.user_id &&
        creditRoles.has(
          credit.contribution_role,
        ),
    );

  if (linkedBeat?.producer_user_id) {
    credits.push({
      user_id:
        linkedBeat.producer_user_id,
      contribution_role: "producer",
    });
  }

  const uniqueCredits = Array.from(
    new Map(
      credits.map((credit) => [
        `${credit.user_id}:${credit.contribution_role}`,
        credit,
      ]),
    ).values(),
  );

  if (!uniqueCredits.length) {
    throw new Error(
      "Add at least one person to the track credits.",
    );
  }

  const requestedIds = Array.from(
    new Set(
      uniqueCredits.map(
        (credit) => credit.user_id,
      ),
    ),
  );

  const { data: members, error: memberError } =
    await admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", project.id)
      .eq("status", "active")
      .in("user_id", requestedIds);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const allowed = new Set(
    (members ?? []).map(
      (member) => member.user_id,
    ),
  );

  if (
    requestedIds.some(
      (id) => !allowed.has(id),
    )
  ) {
    throw new Error(
      "Every credited person must be an active member of this project.",
    );
  }

  await assertR2BucketAccess();

  const trackId = crypto.randomUUID();
  const safeName = fileName.replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );

  const storageKey =
    `${project.id}/tracks/${trackId}/` +
    `${crypto.randomUUID()}-${safeName}`;

  const uploadUrl =
    await createR2PresignedUrl(
      "PUT",
      storageKey,
      900,
      mimeType,
    );

  const requestedCode = read(
    formData,
    "track_code",
  ).toUpperCase();

  const trackCode =
    requestedCode ||
    `TRACK-${Date.now()
      .toString()
      .slice(-5)}`;

  const { error: trackError } = await admin
    .from("tracks")
    .insert({
      id: trackId,
      project_id: project.id,
      beat_id: beatId,
      track_code: trackCode,
      working_title: workingTitle,
      status: developmentStatus,
      development_status:
        developmentStatus,
      created_by: user.id,
    });

  if (trackError) {
    throw new Error(trackError.message);
  }

  const { error: creditsError } = await admin
    .from("track_contributors")
    .insert(
      uniqueCredits.map((credit) => ({
        track_id: trackId,
        user_id: credit.user_id,
        contribution_role:
          credit.contribution_role,
      })),
    );

  if (creditsError) {
    await admin
      .from("tracks")
      .delete()
      .eq("id", trackId)
      .eq("project_id", project.id);

    throw new Error(
      `The track credits could not be recorded: ${creditsError.message}`,
    );
  }

  await admin.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action:
      `registered ${workingTitle}` +
      (beatId
        ? " from a reusable library beat"
        : ""),
    entity_type: "track",
    entity_id: trackId,
  });

  await admin
    .from("platform_events")
    .insert({
      user_id: user.id,
      project_id: project.id,
      event_name: "track_registered",
      category: "music",
      entity_type: "track",
      entity_id: trackId,
      metadata: {
        beat_id: beatId,
        beat_reuse_enabled:
          Boolean(beatId),
      },
    });

  revalidatePath("/tracks");
  revalidatePath("/beats");
  revalidatePath("/workspace");

  return {
    trackId,
    storageKey,
    uploadUrl,
  };
}


export async function saveReusableTrackAsset(formData: FormData) {
  const { admin, project, user } = await requireCreateAccess();

  const trackId = read(formData, "track_id");
  const storageKey = read(formData, "storage_key");
  const fileName = read(formData, "file_name");
  const mimeType = read(formData, "mime_type") || null;
  const assetKind = read(formData, "asset_kind") || "demo";
  const versionNote =
    read(formData, "version_note").slice(0, 280) || null;

  if (!trackId || !storageKey || !fileName) {
    throw new Error("The track file transfer is incomplete.");
  }

  if (!["demo","rough_mix","mix","master","reference"].includes(assetKind)) {
    throw new Error("Choose a valid track file type.");
  }

  const { data: track } = await admin
    .from("tracks")
    .select("id,working_title")
    .eq("id", trackId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!track) {
    throw new Error("That track is not available in this project.");
  }

  await assertR2ObjectAccess(storageKey);

  const { data: asset, error } = await admin
    .from("project_assets")
    .insert({
      project_id: project.id,
      entity_type: "track",
      entity_id: trackId,
      uploaded_by: user.id,
      bucket_id: "r2",
      storage_path: storageKey,
      file_name: fileName,
      mime_type: mimeType,
      asset_kind: assetKind,
      version_note: versionNote,
      visibility: "project",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `The track file was transferred but could not be registered: ${error.message}`,
    );
  }

  await admin.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action: `uploaded ${assetKind.replaceAll("_", " ")} for ${track.working_title || "a track"}`,
    entity_type: "track",
    entity_id: trackId,
  });

  await admin.from("platform_events").insert({
    user_id: user.id,
    project_id: project.id,
    event_name: "track_file_uploaded",
    category: "music",
    entity_type: "asset",
    entity_id: asset!.id,
    metadata: {
      track_id: trackId,
      asset_kind: assetKind,
      storage_provider: "r2",
    },
  });

  revalidatePath("/tracks");
  revalidatePath("/beats");
  revalidatePath("/workspace");

  return { ok: true };
}

export async function discardReusableTrackIntake(trackId: string) {
  const { admin, project, user } = await requireCreateAccess();

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

export async function prepareTrackReplacement(
  formData: FormData,
) {
  const { admin, project } =
    await requireCreateAccess();

  const trackId = read(
    formData,
    "track_id",
  );
  const workingTitle = read(
    formData,
    "working_title",
  );
  const beatId =
    read(formData, "beat_id") || null;
  const fileName = read(
    formData,
    "file_name",
  );
  const mimeType =
    read(formData, "file_type") ||
    "application/octet-stream";
  const fileSize = Number(
    read(formData, "file_size"),
  );

  if (!trackId || !workingTitle) {
    throw new Error(
      "Track and replacement title are required.",
    );
  }

  const { data: track } = await admin
    .from("tracks")
    .select(
      "id,working_title,development_status,status,beat_id",
    )
    .eq("id", trackId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!track) {
    throw new Error(
      "That track is not available in this project.",
    );
  }

  if (
    ["release_ready", "complete"].includes(
      track.development_status ||
        track.status,
    )
  ) {
    throw new Error(
      "Release-ready or completed tracks should not be replaced. Add a new version instead.",
    );
  }

  // Protect voting integrity.
  const { data: openRound } = await admin
    .from("track_voting_rounds")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (openRound) {
    throw new Error(
      "Track replacement is locked while voting is open. Close the voting round before replacing a track.",
    );
  }

  if (beatId) {
    const { data: beat } = await admin
      .from("beats")
      .select("id")
      .eq("id", beatId)
      .eq("project_id", project.id)
      .maybeSingle();

    if (!beat) {
      throw new Error(
        "The selected replacement beat is not available in this project.",
      );
    }
  }

  if (
    !fileName ||
    !Number.isFinite(fileSize) ||
    fileSize <= 0
  ) {
    throw new Error(
      "Choose the replacement audio.",
    );
  }

  if (
    fileSize > 250 * 1024 * 1024 ||
    !mimeType.startsWith("audio/")
  ) {
    throw new Error(
      "Replacement must be a valid audio file smaller than 250 MB.",
    );
  }

  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured for track files yet.",
    );
  }

  await assertR2BucketAccess();

  const safeName = fileName.replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );

  const storageKey =
    `${project.id}/tracks/${trackId}/` +
    `${crypto.randomUUID()}-${safeName}`;

  return {
    trackId,
    previousTitle:
      track.working_title ||
      "Untitled track",
    workingTitle,
    beatId,
    storageKey,
    uploadUrl:
      await createR2PresignedUrl(
        "PUT",
        storageKey,
        900,
        mimeType,
      ),
  };
}

export async function finalizeTrackReplacement(
  formData: FormData,
) {
  const { admin, project, user } =
    await requireCreateAccess();

  const trackId = read(
    formData,
    "track_id",
  );
  const workingTitle = read(
    formData,
    "working_title",
  );
  const beatId =
    read(formData, "beat_id") || null;
  const previousTitle = read(
    formData,
    "previous_title",
  );

  const { data: openRound } = await admin
    .from("track_voting_rounds")
    .select("id")
    .eq("project_id", project.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (openRound) {
    throw new Error(
      "Track replacement is locked while voting is open.",
    );
  }

  const { error } = await admin
    .from("tracks")
    .update({
      working_title: workingTitle,
      beat_id: beatId,
      status: "in_development",
      development_status:
        "in_development",
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", trackId)
    .eq("project_id", project.id);

  if (error) {
    throw new Error(error.message);
  }

  if (beatId) {
    const { data: replacementBeat } = await admin
      .from("beats")
      .select("producer_user_id")
      .eq("id", beatId)
      .eq("project_id", project.id)
      .maybeSingle();

    if (replacementBeat?.producer_user_id) {
      await admin.from("track_contributors").upsert(
        {
          track_id: trackId,
          user_id: replacementBeat.producer_user_id,
          contribution_role: "producer",
        },
        { onConflict: "track_id,user_id,contribution_role" },
      );
    }
  }

  await admin.from("activity_log").insert({
    project_id: project.id,
    user_id: user.id,
    action:
      `replaced ${previousTitle || "an incomplete track"}` +
      ` with ${workingTitle} while keeping the same track record`,
    entity_type: "track",
    entity_id: trackId,
  });

  await admin
    .from("platform_events")
    .insert({
      user_id: user.id,
      project_id: project.id,
      event_name: "track_replaced",
      category: "music",
      entity_type: "track",
      entity_id: trackId,
      metadata: {
        previous_title:
          previousTitle || null,
        new_title: workingTitle,
        beat_id: beatId,
      },
    });

  revalidatePath("/tracks");
  revalidatePath("/workspace");
  revalidatePath(
    `/tracks/${trackId}/replace`,
  );

  return {
    ok: true,
    message:
      "Track replaced without creating another track record. The old audio remains in version history.",
  };
}
