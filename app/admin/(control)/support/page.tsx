import Link from "next/link";
import SupportConversation, { SupportAutoRefresh } from "../../../../components/SupportConversation";
import { getControlRoomSupport, resolveControlRoomSupportThread } from "../../../support/actions";
import "../../../support/support.css";

export const dynamic = "force-dynamic";

export default async function ControlRoomSupportPage({
  searchParams
}: { searchParams: Promise<{ thread?: string }> }) {
  const { thread } = await searchParams;
  const data = await getControlRoomSupport(thread);
  const selected = data.threads.find(item => item.id === data.selectedId);
  return <div className="fm-admin-support">
    <section className="control-page-hero enquiries">
      <span className="control-eyebrow">CUSTOMER CARE / CONTROL ROOM</span>
      <h1>Help people keep moving.</h1>
      <p>Reply to support conversations without leaving FACKTS Music. The inbox refreshes automatically while this page is open.</p>
    </section>
    <div className="fm-admin-support-grid">
      <aside className="control-panel fm-admin-support-list" aria-label="Support conversations">
        <h2>Conversations</h2>
        {data.threads.length === 0 && <p>No support conversations yet.</p>}
        {data.threads.map(item =>
          <Link className={item.id === data.selectedId ? "selected" : ""} key={item.id} href={`/admin/support?thread=${encodeURIComponent(item.id)}`}>
            <strong>{item.customerName}</strong>
            <small>{item.status === "open" ? "Needs a reply" : item.status === "waiting" ? "Agent replied" : "Resolved"}</small>
            <time>{new Date(item.last_message_at).toLocaleString("en-KE", { timeZone:"Africa/Nairobi", dateStyle: "medium", timeStyle: "short" })}</time>
          </Link>
        )}
      </aside>
      <div className="fm-admin-support-chat">
        {selected ? <>
          <header className="fm-admin-support-header">
            <div><span className="control-eyebrow">SUPPORT THREAD</span><h2>{selected.customerName}</h2></div>
            {selected.status !== "resolved" && <form action={resolveControlRoomSupportThread}>
              <input type="hidden" name="thread_id" value={selected.id}/>
              <button type="submit">Resolve</button>
            </form>}
          </header>
          <SupportConversation messages={data.messages} threadId={selected.id} status={selected.status} agent />
        </> : <div className="control-panel"><p>Choose a conversation to see messages and reply.</p></div>}
      </div>
    </div>
    <SupportAutoRefresh intervalMs={7000}/>
    <style>{`
      .fm-admin-support-grid{display:grid;grid-template-columns:minmax(210px,320px) minmax(0,1fr);gap:18px;margin-top:24px;align-items:start}
      .fm-admin-support-list{max-height:640px;overflow-y:auto}
      .fm-admin-support-list h2{font-size:16px;margin:0 0 16px}
      .fm-admin-support-list a{display:grid;gap:6px;text-decoration:none;padding:13px;border-radius:12px;border:1px solid transparent;color:inherit}
      .fm-admin-support-list a.selected{border-color:#ff6a00;background:rgba(255,106,0,.08)}
      .fm-admin-support-list a:hover{background:rgba(255,255,255,.05)}
      .fm-admin-support-list small,.fm-admin-support-list time{color:#a1a1aa;font-size:11px}
      .fm-admin-support-header{display:flex;justify-content:space-between;align-items:center;gap:12px}
      .fm-admin-support-header h2{margin:4px 0}
      .fm-admin-support-header button{border:1px solid #666;border-radius:9px;padding:9px 14px;background:transparent;color:inherit;cursor:pointer}
      .fm-admin-support-chat .fm-support-window{margin-top:12px}
      @media(max-width:780px){.fm-admin-support-grid{grid-template-columns:1fr}.fm-admin-support-list{max-height:200px}}
    `}</style>
  </div>;
}
