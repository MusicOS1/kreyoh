"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";
import { createAdminClient } from "../../lib/supabase/admin";
import { requireControlRoomPermission } from "../../lib/controlRoom";

export type SupportMessage = { id: string; body: string; sender_role: "customer" | "agent"; created_at: string };
export type SupportActionState = { error: string; sent: number };
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signedIn() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getMySupportConversation() {
  const user = await signedIn();
  if (!user) return { signedIn: false as const, thread: null, messages: [] as SupportMessage[] };
  const admin = createAdminClient();
  const { data: thread, error } = await admin.from("music_support_threads")
    .select("id,status,created_at,last_message_at")
    .eq("requester_id", user.id).maybeSingle();
  if (error) throw new Error("Support is temporarily unavailable.");
  if (!thread) return { signedIn: true as const, thread: null, messages: [] as SupportMessage[] };
  const { data: messages, error: messageError } = await admin.from("music_support_messages")
    .select("id,body,sender_role,created_at").eq("thread_id", thread.id)
    .order("created_at", { ascending: true }).limit(200);
  if (messageError) throw new Error("Support messages could not be loaded.");
  return { signedIn: true as const, thread, messages: (messages || []) as SupportMessage[] };
}

export async function sendSupportMessage(
  _previous: SupportActionState,
  form: FormData
): Promise<SupportActionState> {
  try {
    const user = await signedIn();
    if (!user) return { error: "Please sign in to message support.", sent: 0 };
    const body = String(form.get("message") || "").trim();
    if (body.length < 1 || body.length > 2000)
      return { error: "Write a message of up to 2,000 characters.", sent: 0 };

    const admin = createAdminClient();
    const { data: thread, error: threadError } = await admin.from("music_support_threads")
      .upsert({ requester_id: user.id, status: "open", last_message_at: new Date().toISOString() },
        { onConflict: "requester_id" })
      .select("id").single();
    if (threadError || !thread) throw new Error("Could not open your support conversation.");
    const { error } = await admin.from("music_support_messages")
      .insert({ thread_id: thread.id, sender_id: user.id, sender_role: "customer", body });
    if (error) throw new Error("Your message could not be sent.");
    await admin.from("music_support_threads").update({
      status: "open", last_message_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", thread.id).eq("requester_id", user.id);
    revalidatePath("/support");
    revalidatePath("/admin/support");
    return { error: "", sent: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not send your message.", sent: 0 };
  }
}

export async function getControlRoomSupport(threadId?: string) {
  await requireControlRoomPermission("enquiries");
  const admin = createAdminClient();
  const { data: threads, error } = await admin.from("music_support_threads")
    .select("id,requester_id,status,last_message_at,created_at")
    .order("last_message_at", { ascending: false }).limit(100);
  if (error) throw new Error("Support conversations could not be loaded.");
  const ids = (threads || []).map((thread) => thread.requester_id);
  const { data: people } = ids.length ? await admin.from("profiles")
    .select("id,full_name,stage_name,nickname,email").in("id", ids) : { data: [] };
  const names = new Map((people || []).map((person) => [
    person.id, person.stage_name || person.nickname || person.full_name || person.email || "FACKTS Music member"
  ]));
  const selected = validUuid.test(threadId || "") ?
    (threads || []).find((thread) => thread.id === threadId) : (threads || [])[0];
  let messages: SupportMessage[] = [];
  if (selected) {
    const result = await admin.from("music_support_messages")
      .select("id,body,sender_role,created_at").eq("thread_id", selected.id)
      .order("created_at", { ascending: true }).limit(200);
    if (result.error) throw new Error("Support messages could not be loaded.");
    messages = (result.data || []) as SupportMessage[];
  }
  return { threads: (threads || []).map((thread) => ({
    ...thread, customerName: names.get(thread.requester_id) || "FACKTS Music member"
  })), selectedId: selected?.id || null, messages };
}

export async function sendControlRoomSupportReply(
  _previous: SupportActionState,
  form: FormData
): Promise<SupportActionState> {
  try {
    const agent = await requireControlRoomPermission("enquiries");
    const threadId = String(form.get("thread_id") || "");
    const body = String(form.get("message") || "").trim();
    if (!validUuid.test(threadId) || !body || body.length > 2000)
      return { error: "Choose a conversation and write a reply of up to 2,000 characters.", sent: 0 };
    const admin = createAdminClient();
    const { data: thread } = await admin.from("music_support_threads")
      .select("id").eq("id", threadId).maybeSingle();
    if (!thread) return { error: "Conversation not found.", sent: 0 };
    const { error } = await admin.from("music_support_messages")
      .insert({ thread_id: thread.id, sender_id: agent.id, sender_role: "agent", body });
    if (error) throw new Error("Your reply could not be sent.");
    await admin.from("music_support_threads").update({
      status: "waiting", last_message_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq("id", thread.id);
    revalidatePath("/admin/support");
    revalidatePath("/support");
    return { error: "", sent: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not send your reply.", sent: 0 };
  }
}

export async function resolveControlRoomSupportThread(form: FormData) {
  await requireControlRoomPermission("enquiries");
  const threadId = String(form.get("thread_id") || "");
  if (!validUuid.test(threadId)) throw new Error("Invalid conversation.");
  const { error } = await createAdminClient().from("music_support_threads")
    .update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", threadId);
  if (error) throw new Error("Could not resolve the conversation.");
  revalidatePath("/admin/support");
  revalidatePath("/support");
}
