import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
const kinds = new Set(["render_error", "runtime_error", "unhandled_rejection"]);
const reasons = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError", "Error", "ChunkLoadError", "NetworkError", "Unknown"]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const { data: { user }, error: authError } = await (await createClient()).auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !kinds.has(body.kind)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const admin = createAdminClient();
  const recent = await admin.from("system_incidents").select("id")
    .eq("source", "client_runtime")
    .contains("context", { user_id: user.id })
    .gte("created_at", new Date(Date.now() - 60000).toISOString()).limit(6);
  if (recent.error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  if ((recent.data || []).length >= 5) return NextResponse.json({ accepted: false }, { status: 429 });

  // Only bounded, categorical information is accepted. No stack traces, message text,
  // URLs with query strings, personal data, credentials or tokens enter the ledger.
  const reason = reasons.has(body.reason) ? body.reason : "Unknown";
  const rawRoute = typeof body.route === "string" ? body.route : "";
  const route = rawRoute.startsWith("/") && !rawRoute.includes("?") && !rawRoute.includes("#")
    ? rawRoute.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").replace(/[^/a-zA-Z0-9:_-]/g, "").slice(0, 120)
    : "/unknown";
  const { error } = await admin.from("system_incidents").insert({
    severity: "medium", source: "client_runtime", message: "Client application error",
    context: { user_id: user.id, kind: body.kind, reason, route, diagnostics_version: 1 },
  });
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
}
