import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function allowed(request: NextRequest) {
  const secret = process.env.FACKTS_MONITOR_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  return Boolean(secret && secret.length >= 32 && secret.length === token.length && timingSafeEqual(Buffer.from(secret), Buffer.from(token)));
}
export async function GET(request: NextRequest) {
  if (!allowed(request)) return Response.json({ ok: false }, { status: 401, headers });
  try {
    const admin = createAdminClient();
    const now = new Date();
    const [creators, projects, beats, claims, sessions] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("beats").select("id", { count: "exact", head: true }),
      admin.from("beat_claims").select("id", { count: "exact", head: true }).in("status", ["claimed", "confirmed", "converted_to_track"]),
      admin.from("studio_sessions").select("id", { count: "exact", head: true }).gte("starts_at", now.toISOString()),
    ]);
    const values = [creators, projects, beats, claims, sessions];
    if (values.some((result) => result.error || result.count === null)) throw Error("Music operational query failed.");
    return Response.json({
      schema: 1, source: "music_os", observed_at: now.toISOString(),
      metrics: [
        { key: "creators", label: "Registered creators", value: creators.count, href: "/admin/users" },
        { key: "active_projects", label: "Active projects", value: projects.count, href: "/admin/projects" },
        { key: "beats", label: "Beats uploaded", value: beats.count, href: "/admin" },
        { key: "beat_claims", label: "Beat claims", value: claims.count, href: "/admin" },
        { key: "upcoming_sessions", label: "Upcoming sessions", value: sessions.count, href: "/admin" },
      ],
    }, { headers });
  } catch (error) {
    console.error("[group-monitor] Music snapshot unavailable", error instanceof Error ? error.message : "unknown");
    return Response.json({ ok: false, error: "Operational snapshot unavailable" }, { status: 503, headers });
  }
}
