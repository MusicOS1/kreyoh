import Link from "next/link";
import type {ReactNode} from "react";
import PublicNavigation from "./PublicNavigation";
import PublicFooter from "./PublicFooter";

export type LegalSection = {id:string;label:string;content:ReactNode};

export default function LegalPageFrame({
  eyebrow,title,lead,sections,
}:{
  eyebrow:string;title:string;lead:string;sections:LegalSection[];
}){
  return <main className="public-site fm-legal-site">
    <PublicNavigation/>
    <header className="fm-legal-hero">
      <span className="fm-legal-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{lead}</p>
      <div className="fm-legal-meta">
        <span>Last updated: 25 October 2026</span>
        <span>FACKTS Music · FACKTS Africa</span>
      </div>
    </header>
    <div className="fm-legal-layout">
      <aside className="fm-legal-index" aria-label="Sections on this page">
        <p>ON THIS PAGE</p>
        <nav>{sections.map(section=><a href={"#"+section.id} key={section.id}>{section.label}</a>)}</nav>
        <Link href="/contact">Contact FACKTS Music ↗</Link>
      </aside>
      <article className="fm-legal-document">
        {sections.map(section=><section id={section.id} key={section.id} className="fm-legal-section">
          <h2>{section.label}</h2>
          {section.content}
        </section>)}
      </article>
    </div>
    <aside className="fm-legal-help">
      <div><span>QUESTIONS, REQUESTS OR COMPLAINTS</span><h2>Speak to the people behind the platform.</h2>
        <p>For personal data rights or creative-rights issues, send a clear request to our public contact address. Never include your password or full identity documents in an initial message.</p></div>
      <a href="mailto:info@facktsafrica.co.ke">info@facktsafrica.co.ke ↗</a>
    </aside>
    <PublicFooter/>
  </main>;
}
