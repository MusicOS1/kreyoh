"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspace } from "../../lib/workspace";

export async function submitSuggestion(formData: FormData) {
  const { user, admin } = await getWorkspace();
  const suggestion = String(formData.get("suggestion") || "").trim();
  const suggestionType = String(formData.get("suggestion_type") || "other");
  if (suggestion.length < 3) throw new Error("Tell us enough to understand the suggestion.");
  const { error } = await admin.from("platform_suggestions").insert({ submitted_by: user.id, project_id: String(formData.get("project_id") || "") || null, suggestion_type: suggestionType, suggestion });
  if (error) throw new Error(error.message);
  revalidatePath("/suggestions"); redirect("/suggestions?submitted=1");
}
