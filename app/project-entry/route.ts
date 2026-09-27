import { NextResponse } from "next/server";
import { getWorkspace } from "../../lib/workspace";
import { safeNext } from "../../lib/navigation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { activeProjects } = await getWorkspace();
  const projectId = url.searchParams.get("project_id");
  if (!projectId || !activeProjects.some((project: any) => project.id === projectId)) {
    return NextResponse.redirect(new URL("/projects?error=Project+access+is+not+available.+Check+your+invitations.", url.origin));
  }
  const next = safeNext(url.searchParams.get("next"), "/member-dashboard");
  const response = NextResponse.redirect(new URL(next.startsWith("/project-entry") ? "/member-dashboard" : next, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set("fackts_project_id", projectId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  return response;
}
