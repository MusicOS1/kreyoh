import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { markNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const { supabase, user } = await getWorkspace();
  const { data: items = [] } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return <AppShell><div className="content"><div className="heading"><div><span className="eyebrow">YOUR SIGNALS</span><h1>Notifications</h1><p>Only the activity that needs your attention.</p></div><form action={markNotificationsRead}><button>Mark all read</button></form></div><div className="operations-list">{!items?.length && <div className="empty-state"><h2>You are all caught up</h2></div>}{(items ?? []).map((n: any) => <article className={`panel notification-card ${n.read_at ? "" : "unread"}`} key={n.id}><span className="eyebrow">{n.type.replaceAll("_", " ")}</span><h2>{n.title}</h2>{n.body && <p>{n.body}</p>}{n.type === "project_invitation" && <Link href="/invitations" className="creative-section-link">View invitation →</Link>}<small>{new Date(n.created_at).toLocaleString("en-KE")}</small></article>)}</div></div></AppShell>;
}
