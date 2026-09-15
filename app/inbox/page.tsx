import Link from "next/link";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {markInboxItemRead,markInboxRead} from "./actions";

function fallbackHref(item:any){
  if(item.action_url)return item.action_url;
  if(item.type==="project_invitation"||item.type==="support_portal_invitation")return"/invitations";
  if(item.entity_type==="track")return"/track-records";
  if(["task","project_task"].includes(item.entity_type))return"/tasks";
  if(["session","studio_session"].includes(item.entity_type))return"/studio-sessions";
  if(item.entity_type==="project_update")return"/inbox";
  return"/home";
}

export default async function InboxPage(){
  const{supabase,user}=await getWorkspace();

  const{data:items=[]}=await supabase.from("notifications")
    .select("*")
    .eq("user_id",user.id)
    .order("created_at",{ascending:false})
    .limit(100);

  const unread=(items||[]).filter((item:any)=>!item.read_at).length;

  return<AppShell>
    <style>{`
      .inbox-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0 22px}
      .inbox-summary article{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .inbox-summary span{display:block;color:rgba(255,255,255,.4);font-size:9px;text-transform:uppercase}.inbox-summary strong{display:block;margin-top:5px;font-size:20px}
      .inbox-list{display:grid;gap:10px}.inbox-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:18px}.inbox-item.unread{border-color:rgba(255,138,31,.34);box-shadow:inset 3px 0 #ff8a1f}
      .inbox-meta{display:flex;gap:8px;flex-wrap:wrap}.inbox-meta span{font-size:9px;color:rgba(255,255,255,.45);text-transform:uppercase}
      .inbox-item p{white-space:pre-line}.inbox-actions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
      @media(max-width:700px){.inbox-summary{grid-template-columns:1fr}.inbox-item{grid-template-columns:1fr}}
    `}</style>
    <div className="content operations-page">
      <div className="heading">
        <div><span className="eyebrow">YOUR FACKTS MUSIC INBOX</span><h1>Inbox</h1><p>Invitations, project updates, approvals and role-specific messages live here so important changes do not disappear inside a bell menu.</p></div>
        <form action={markInboxRead}><button>Mark all read</button></form>
      </div>

      <section className="inbox-summary">
        <article><span>Unread</span><strong>{unread}</strong></article>
        <article><span>Total messages</span><strong>{items?.length||0}</strong></article>
        <article><span>Status</span><strong>{unread?"Needs attention":"Caught up"}</strong></article>
      </section>

      <section className="inbox-list">
        {!items?.length&&<div className="panel empty-state"><h2>Your Inbox is clear</h2><p>Project updates and actions requiring your attention will appear here.</p></div>}
        {(items||[]).map((item:any)=><article className={`panel inbox-item ${item.read_at?"":"unread"}`} key={item.id}>
          <div>
            <div className="inbox-meta"><span>{String(item.type).replaceAll("_"," ")}</span>{item.audience_role&&<span>For {item.audience_role}</span>}<span>{item.importance||"normal"}</span></div>
            <h2>{item.title}</h2>
            {item.body&&<p>{item.body}</p>}
            <small>{new Date(item.created_at).toLocaleString("en-KE")}</small>
          </div>
          <div className="inbox-actions">
            <Link className="secondary-button-inline" href={fallbackHref(item)}>Open →</Link>
            {!item.read_at&&<form action={markInboxItemRead}><input type="hidden" name="notification_id" value={item.id}/><button>Mark read</button></form>}
          </div>
        </article>)}
      </section>
    </div>
  </AppShell>;
}
