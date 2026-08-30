"use server";
import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";

export async function markNotificationsRead() {
  const { supabase, user } = await getWorkspace();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/notifications"); revalidatePath("/home"); revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  const { supabase, user } = await getWorkspace();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", String(formData.get("notification_id") || "")).eq("user_id", user.id);
  revalidatePath("/notifications"); revalidatePath("/home"); revalidatePath("/", "layout");
}
