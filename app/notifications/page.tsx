import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { markNotificationRead, markNotificationsRead } from "./actions";

function notificationHref(item: any) {
  if (item.type === "project_invitation") return "/invitations";
  if (item.entity_type === "track") return "/tracks";
  if (item.entity_type === "beat") return "/beats";
  if (["task","project_task"].includes(item.entity_type)) return "/tasks";
  if (["session","studio_session"].includes(item.entity_type)) return "/studio-sessions";
  if (item.entity_type === "project") return "/projects";
  return "/notifications";
}

export default async function NotificationsPage() {
  const { supabase, user } = await getWorkspace();
  const { data: items = [] } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return <AppShell><div className="content notifications-page">
    <div className="heading"><div><span className="eyebrow">YOUR SIGNALS</span><h1>Notifications</h1><p>Only the activity that needs your attention.</p></div><form action={markNotificationsRead}><button>Mark all read</button></form></div>
    <div className="operations-list">{!items?.length && <div className="empty-state"><h2>You are all caught up</h2></div>}{(items ?? []).map((item: any) => <article className={`panel notification-card ${item.read_at ? "" : "unread"}`} key={item.id}>
      <div><span className="eyebrow">{item.type.replaceAll("_", " ")}</span><h2>{item.title}</h2>{item.body && <p>{item.body}</p>}<small>{new Date(item.created_at).toLocaleString("en-KE")}</small></div>
      <div className="notification-actions"><Link href={notificationHref(item)} className="creative-section-link">Open →</Link>{!item.read_at && <form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id}/><button>Mark as read</button></form>}</div>
    </article>)}</div>
  </div></AppShell>;
}
