import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

function safeDestination(request: NextRequest) {
  return request.nextUrl.searchParams.get("next") === "/admin/login" ? "/admin/login" : "/login";
}

async function completeSignOut(request: NextRequest) {
  const destination = safeDestination(request);
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      const admin = createAdminClient();
      const now = new Date().toISOString();
      await Promise.allSettled([
        admin.from("profiles").update({ last_logout_at: now }).eq("id", user.id),
        admin.from("auth_events").insert({
          user_id: user.id,
          event_name: "logout_completed",
          metadata: { surface: destination === "/admin/login" ? "control_room" : "main" },
        }),
        admin.from("user_presence").update({ status: "offline", updated_at: now }).eq("user_id", user.id),
      ]);
    } catch {
      // Optional activity logging must never prevent sign-out.
    }
  }

  await supabase.auth.signOut({ scope: "local" });
  response.cookies.set("fackts_project_id", "", {path:"/",maxAge:0});
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  // A link prefetch or external navigation must never terminate a valid session.
  const action=safeDestination(request)==="/admin/login"?"/auth/signout?next=/admin/login":"/auth/signout";
  return new NextResponse(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign out | FACKTS Music</title><body style="background:#080809;color:white;font:18px system-ui;padding:24px"><h1>Sign out of FACKTS Music?</h1><form action="${action}" method="post"><button style="font:inherit;min-height:48px">Sign out</button></form><p><a style="color:#ffad63" href="/home">Keep listening and working</a></p></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
}

export async function POST(request: NextRequest) {
  const origin=request.headers.get("origin");
  if(origin&&origin!==request.nextUrl.origin)return new NextResponse("Invalid origin",{status:403});
  return completeSignOut(request);
}
