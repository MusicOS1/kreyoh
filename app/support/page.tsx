import Link from "next/link";
import type { Metadata } from "next";
import PublicNavigation from "../../components/PublicNavigation";
import PublicFooter from "../../components/PublicFooter";
import SupportConversation from "../../components/SupportConversation";
import { getMySupportConversation } from "./actions";
import "./support.css";

export const metadata: Metadata = { title: "FACKTS Music Support", description: "Speak to FACKTS Music customer support." };
export const dynamic = "force-dynamic";

export default async function MusicSupportPage() {
  const support = await getMySupportConversation();
  return <main className="public-site fm-support-page">
    <PublicNavigation />
    <div className="fm-support-layout">
      <div className="fm-support-heading">
        <span>FACKTS MUSIC / SUPPORT</span>
        <h1>Need a hand?</h1>
        <p>Talk to the FACKTS Music team about listening, uploads, projects, subscriptions or anything stopping you from moving forward.</p>
      </div>
      {support.signedIn ? <SupportConversation messages={support.messages} status={support.thread?.status}/> :
        <div className="fm-support-login">
          <h2>Sign in to start a conversation</h2>
          <p>Your support messages stay attached to your account, so you can return to the conversation later.</p>
          <Link href="/login?next=/support" className="fm-support-login-cta">Sign in to message support</Link>
          <p>Not a member yet? <Link href="/contact">Send a general enquiry</Link>.</p>
        </div>}
    </div>
    <PublicFooter />
  </main>;
}
