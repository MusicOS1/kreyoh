"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";

export type SplitActionState = { error?: string; success?: string };
export async function updateSplitPlan(_previous: SplitActionState, fd: FormData): Promise<SplitActionState> {
  const { admin, user, activeProjects } = await getWorkspace();
  const read = (key: string) => String(fd.get(key) || "").trim();
  const projectId = read("project_id"), trackId = read("track_id"), operation = read("operation");
  if (!activeProjects.some((project: any) => project.id === projectId)) return { error: "Active project access required." };
  if (!["save", "send", "confirm", "request_change"].includes(operation)) return { error: "Choose a valid split action." };
  let rows: unknown = [];
  try { rows = JSON.parse(read("rows") || "[]"); } catch { return { error: "The allocation list could not be read." }; }
  const version = Number(read("version"));
  if (!Number.isInteger(version) || version < 0) return { error: "Refresh the page to load the latest proposal." };
  const { error } = await admin.rpc("manage_split_plan", {
    p_actor: user.id, p_project: projectId, p_track: trackId, p_operation: operation,
    p_version: version, p_rows: rows, p_split: read("split_id") || null, p_reason: read("reason") || null,
  });
  if (error) {
    console.error("Split workflow failed", error.code);
    const message = error.code === "P0001" ? error.message : error.code === "PGRST202"
      ? "Split updates need a database upgrade. Please contact the project administrator."
      : "The update could not be saved. Your proposal has not been changed. Please retry or contact support.";
    return { error: message };
  }
  for (const path of ["/splits", "/home", "/member-dashboard", "/inbox", "/notifications", `/track-records/${trackId}`]) revalidatePath(path);
  return { success: operation === "save" ? "Draft saved. All contributors must review this revised proposal." : operation === "send" ? "Proposal sent to contributors." : operation === "confirm" ? "Your share is confirmed." : "Change requested. The proposal is back in draft for review." };
}
