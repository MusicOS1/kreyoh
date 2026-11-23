"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendSupportMessage, sendControlRoomSupportReply, type SupportMessage, type SupportActionState } from "../app/support/actions";

const initialState: SupportActionState = { error: "", sent: 0 };

function MessageForm({ agent = false, threadId }: { agent?: boolean; threadId?: string }) {
  const [state, action, pending] = useActionState(agent ? sendControlRoomSupportReply : sendSupportMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.sent) formRef.current?.reset(); }, [state.sent]);
  return (
    <form action={action} ref={formRef} className="fm-support-composer">
      {threadId && <input type="hidden" name="thread_id" value={threadId} />}
      <label htmlFor={agent ? "agent-support-message" : "customer-support-message"} className="fm-support-sr-only">Your message</label>
      <textarea id={agent ? "agent-support-message" : "customer-support-message"} name="message" rows={2} minLength={1} maxLength={2000} placeholder={agent ? "Write a helpful reply…" : "Tell us what you need help with…"} required />
      <button type="submit" disabled={pending}>{pending ? "Sending…" : agent ? "Reply" : "Send message"}</button>
      {state.error && <p role="alert" className="fm-support-error">{state.error}</p>}
    </form>
  );
}

export function SupportAutoRefresh({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const interval = window.setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [router, intervalMs]);
  return null;
}

export default function SupportConversation({
  messages, agent = false, threadId, status
}: {
  messages: SupportMessage[]; agent?: boolean; threadId?: string; status?: string
}) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages.length]);
  return <section className="fm-support-window" aria-label={agent ? "Customer support conversation" : "Your support conversation"}>
    <div className="fm-support-status">
      <span className="fm-support-presence" aria-hidden="true" />
      <span>{status === "resolved" ? "Previously resolved · You can send another message" : status === "waiting" ? "Support has replied" : "Messages reach our support team. We reply when an agent is available."}</span>
    </div>
    <div className="fm-support-timeline" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 && <div className="fm-support-empty">Hi! Welcome to FACKTS Music support. Tell us what you need help with and the team will see your message.</div>}
      {messages.map(item => {
        const mine = agent ? item.sender_role === "agent" : item.sender_role === "customer";
        return <article key={item.id} className={`fm-support-message ${mine ? "mine" : "theirs"}`}>
          <small>{item.sender_role === "agent" ? "FACKTS Music Support" : agent ? "Customer" : "You"}</small>
          <p>{item.body}</p>
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" })}</time>
        </article>;
      })}
      <div ref={bottom}/>
    </div>
    <MessageForm agent={agent} threadId={threadId}/>
    <SupportAutoRefresh/>
  </section>;
}
