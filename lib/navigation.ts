export function safeNext(value: string | null | undefined, fallback = "/home") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://fackts.invalid");
    if (url.origin !== "https://fackts.invalid" || ["/login", "/signup", "/auth/callback", "/auth/signout"].includes(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
export function projectLink(projectId: string, next: string) {
  return `/project-entry?project_id=${encodeURIComponent(projectId)}&next=${encodeURIComponent(safeNext(next))}`;
}
export function notificationLink(item: {type?: string; entity_type?: string; entity_id?: string; project_id?: string; action_url?: string}) {
  let next = safeNext(item.action_url, "");
  if (item.type?.startsWith("split_")) next = `/splits${item.entity_id ? `?track=${encodeURIComponent(item.entity_id)}` : ""}`;
  else if (!next) {
    if (item.type?.includes("invitation")) next = "/invitations";
    else if (item.entity_type === "track") next = item.entity_id ? `/track-records/${encodeURIComponent(item.entity_id)}` : "/track-records";
    else if (item.entity_type === "beat") next = "/beats";
    else if (["task", "project_task"].includes(item.entity_type || "")) next = "/tasks";
    else if (["session", "studio_session"].includes(item.entity_type || "")) next = "/studio-sessions";
    else next = "/home";
  }
  return item.project_id && next !== "/invitations" ? projectLink(item.project_id, next) : next;
}
