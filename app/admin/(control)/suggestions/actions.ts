"use server";
import { revalidatePath } from "next/cache";
import { requireControlRoomAdmin } from "../../../../lib/controlRoom";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function updateSuggestionStatus(formData: FormData) {
  const actor = await requireControlRoomAdmin(); const admin = createAdminClient();
  const status = String(formData.get("status") || "reviewing");
  const allowed = ["new","reviewing","accepted","planned","closed"];
  if (!allowed.includes(status)) throw new Error("Choose a valid suggestion status.");
  const { error } = await admin.from("platform_suggestions").update({ status, reviewed_by: actor.id, updated_at: new Date().toISOString() }).eq("id", String(formData.get("suggestion_id") || ""));
  if (error) throw new Error(error.message); revalidatePath("/admin/suggestions");
}
