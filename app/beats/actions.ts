"use server";

import {
  revalidatePath,
} from "next/cache";
import { getWorkspace } from "../../lib/workspace";

const MANAGER_ROLES = [
  "Project Lead",
  "Admin",
  "Producer",
];

const LEAD_ROLES = [
  "Project Lead",
  "Admin",
];

const ALLOWED_STATUSES = [
  "submitted",
  "available",
  "assigned",
  "writing",
  "ready for session",
  "recording",
  "production",
  "mixing",
  "mastering",
  "rights pending",
  "release ready",
  "completed",
];

function value(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) || ""
  ).trim();
}

export async function addBeat(
  formData: FormData
) {
  const {
    supabase,
    user,
    project,
    roles,
  } = await getWorkspace();

  if (!project) {
    throw new Error(
      "No active Project 001 workspace."
    );
  }

  if (
    !roles.some((role) =>
      MANAGER_ROLES.includes(role)
    )
  ) {
    throw new Error(
      "You do not have permission to add beats."
    );
  }

  const beatCode = value(
    formData,
    "beat_code"
  );

  if (!beatCode) {
    throw new Error(
      "Beat code is required."
    );
  }

  const { data: beat, error } =
    await supabase
      .from("beats")
      .insert({
        project_id: project.id,
        beat_code: beatCode,
        title:
          value(formData, "title") ||
          null,
        producer_name:
          value(
            formData,
            "producer_name"
          ) || null,
        source_provider:
          value(
            formData,
            "source_provider"
          ) || "External",
        external_url:
          value(
            formData,
            "external_url"
          ) || null,
        downloadable:
          formData.get(
            "downloadable"
          ) === "on",
        status: "available",
        notes:
          value(formData, "notes") ||
          null,
      })
      .select("id")
      .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("activity_log")
    .insert({
      project_id: project.id,
      user_id: user.id,
      action: `Added ${beatCode} to the Beat Library`,
      entity_type: "beat",
      entity_id: beat.id,
    });

  revalidatePath("/");
  revalidatePath("/beats");
}


export async function toggleBeatInterest(
  formData: FormData
) {
  const {
    supabase,
    user,
    project,
  } = await getWorkspace();

  if (!project) return;

  const beatId = value(
    formData,
    "beat_id"
  );

  const beatCode = value(
    formData,
    "beat_code"
  );

  const { data: existing } =
    await supabase
      .from("beat_interest")
      .select("id")
      .eq("beat_id", beatId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existing) {
    await supabase
      .from("beat_interest")
      .delete()
      .eq("id", existing.id);

    await supabase
      .from("activity_log")
      .insert({
        project_id: project.id,
        user_id: user.id,
        action: `Removed interest from ${beatCode}`,
        entity_type: "beat",
        entity_id: beatId,
      });
  } else {
    const { error } = await supabase
      .from("beat_interest")
      .insert({
        beat_id: beatId,
        user_id: user.id,
        status: "interested",
      });

    if (error) {
      throw new Error(error.message);
    }

    await supabase
      .from("activity_log")
      .insert({
        project_id: project.id,
        user_id: user.id,
        action: `Registered interest in ${beatCode}`,
        entity_type: "beat",
        entity_id: beatId,
      });
  }

  revalidatePath("/");
  revalidatePath("/beats");
}


export async function assignBeat(
  formData: FormData
) {
  const {
    supabase,
    user,
    project,
    roles,
  } = await getWorkspace();

  if (!project) return;

  if (
    !roles.some((role) =>
      LEAD_ROLES.includes(role)
    )
  ) {
    throw new Error(
      "Only a Project Lead or Admin can assign artists."
    );
  }

  const beatId = value(
    formData,
    "beat_id"
  );

  const beatCode = value(
    formData,
    "beat_code"
  );

  const artistUserId = value(
    formData,
    "artist_user_id"
  );

  const deadline =
    value(
      formData,
      "writing_deadline"
    ) || null;

  if (!artistUserId) {
    throw new Error(
      "Select an artist."
    );
  }

  const { error } = await supabase
    .from("beat_assignments")
    .upsert(
      {
        beat_id: beatId,
        user_id: artistUserId,
        assigned_by: user.id,
      },
      {
        onConflict:
          "beat_id,user_id",
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  const { error: beatError } =
    await supabase
      .from("beats")
      .update({
        status: "assigned",
        writing_deadline:
          deadline,
      })
      .eq("id", beatId);

  if (beatError) {
    throw new Error(
      beatError.message
    );
  }

  await supabase
    .from("activity_log")
    .insert({
      project_id: project.id,
      user_id: user.id,
      action: `Assigned ${beatCode} to a Project 001 artist`,
      entity_type: "beat",
      entity_id: beatId,
    });

  revalidatePath("/");
  revalidatePath("/beats");
}


export async function updateBeatStatus(
  formData: FormData
) {
  const {
    supabase,
    user,
    project,
    roles,
  } = await getWorkspace();

  if (!project) return;

  if (
    !roles.some((role) =>
      MANAGER_ROLES.includes(role)
    )
  ) {
    throw new Error(
      "You do not have permission to change beat status."
    );
  }

  const beatId = value(
    formData,
    "beat_id"
  );

  const beatCode = value(
    formData,
    "beat_code"
  );

  const status = value(
    formData,
    "status"
  ).toLowerCase();

  if (
    !ALLOWED_STATUSES.includes(
      status
    )
  ) {
    throw new Error(
      "Invalid workflow status."
    );
  }

  const { error } = await supabase
    .from("beats")
    .update({
      status,
    })
    .eq("id", beatId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("activity_log")
    .insert({
      project_id: project.id,
      user_id: user.id,
      action: `Moved ${beatCode} to ${status}`,
      entity_type: "beat",
      entity_id: beatId,
    });

  revalidatePath("/");
  revalidatePath("/beats");
}