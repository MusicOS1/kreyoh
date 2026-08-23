import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

const allowed = new Set(["beat_played"]);
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!allowed.has(body.event_name) || !body.entity_id) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("platform_events").insert({ user_id: user.id, event_name: body.event_name, category: "engagement", entity_type: body.entity_type || null, entity_id: body.entity_id });
  return NextResponse.json({ ok: true });
}
