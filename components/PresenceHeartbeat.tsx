"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/client";

export default function PresenceHeartbeat({ projectId = null }: { projectId?: string | null }) {
  const pathname = usePathname();
  useEffect(() => {
    const supabase = createClient();
    const touch = () => supabase.rpc("touch_my_presence", { target_path: pathname, target_project: projectId }).then(() => undefined);
    void touch();
    const timer = window.setInterval(touch, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void touch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname, projectId]);
  return null;
}
