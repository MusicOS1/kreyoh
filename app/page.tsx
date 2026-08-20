"use client";

import { useState } from "react";
import Link from "next/link";
import AmbientMusicAtmosphere from "../components/AmbientMusicAtmosphere";
import { KreyohLogo, KreyohMark } from "../components/Branding";
import {
  ActivityIcon,
  ArrowUpRight,
  BriefcaseIcon,
  CheckCircleIcon,
  DiscIcon,
  LayersIcon,
  MicIcon,
  MusicIcon,
  UsersIcon,
  WalletIcon,
} from "../components/Icons";

const records = [
  { title: "People", detail: "The room, the roles, and the relationships behind the work.", icon: UsersIcon },
  { title: "Beats", detail: "The catalog, the choices, and the next possible placement.", icon: MusicIcon },
  { title: "Tracks", detail: "Songs moving from first idea to release-ready record.", icon: DiscIcon },
  { title: "Studio Sessions", detail: "Every take, decision, and creative handoff in view.", icon: MicIcon },
  { title: "Tasks", detail: "Clear ownership for the work that keeps momentum alive.", icon: CheckCircleIcon },
  { title: "Splits", detail: "Rights and contribution records built into the project journey.", icon: LayersIcon },
  { title: "Opportunities", detail: "The conversations and openings that move the venture forward.", icon: BriefcaseIcon },
  { title: "Finance", detail: "The commercial record behind the creative ambition.", icon: WalletIcon },
];

const roles = ["Artist", "Producer", "Engineer", "A&R", "Project Lead", "Finance", "Admin"];

const journey = [
  ["01", "Idea", "The spark gets a place to land."],
  ["02", "Beats", "Sound and direction begin to converge."],
  ["03", "Writing", "Ideas become songs with a shared record."],
  ["04", "Sessions", "The room turns creative intent into material."],
  ["05", "Production", "Details, decisions, and delivery get organised."],
  ["06", "Rights", "Contributions and ownership stay visible."],
  ["07", "Release", "The work is ready to meet the world."],
];

export default function PublicHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="public-site">
      <header className="public-nav-wrap">
        <div className="public-nav">
          <Link href="/" className="public-brand" aria-label="KREYOH home" onClick={closeMenu}>
            <KreyohLogo size={34} showTagline={false} />
          </Link>

          <nav className="public-nav-links" aria-label="Public navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#project-001">Project 001</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <Link href="/login" className="public-nav-cta">Sign In <ArrowUpRight size={14} /></Link>
          </nav>

          <button
            type="button"
            className={menuOpen ? "public-menu-trigger is-open" : "public-menu-trigger"}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>

        <nav className={menuOpen ? "public-mobile-menu is-open" : "public-mobile-menu"} aria-label="Mobile navigation">
          <a href="#product" onClick={closeMenu}>Product</a>
          <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
          <a href="#project-001" onClick={closeMenu}>Project 001</a>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
          <Link href="/login" className="public-mobile-cta" onClick={closeMenu}>Sign In <ArrowUpRight size={15} /></Link>
        </nav>
      </header>

      <section className="public-hero" id="top">
        <AmbientMusicAtmosphere variant="intro" />
        <div className="public-hero-grain" aria-hidden="true" />
        <div className="public-hero-content">
          <div className="public-eyebrow"><span className="public-live-dot" /> MUSIC VENTURE OPERATING SYSTEM</div>
          <h1>Run your music venture <span>in one place.</span></h1>
          <p className="public-hero-lead">KREYOH brings the people, music, sessions, tasks, rights, decisions, and business behind a music project into one shared operating system.</p>
          <div className="public-hero-actions">
            <a href="#product" className="public-button public-button-primary">Explore KREYOH <ArrowUpRight size={16} /></a>
            <Link href="/login" className="public-button public-button-ghost">Sign In <ArrowUpRight size={16} /></Link>
          </div>
          <div className="public-hero-note"><span>Built for the whole room</span><span className="public-note-line" /><span>Run it on KREYOH.</span></div>
        </div>
        <div className="public-hero-stage" aria-label="KREYOH operating record preview">
          <div className="public-stage-orbit public-stage-orbit-one" />
          <div className="public-stage-orbit public-stage-orbit-two" />
          <div className="public-console-preview">
            <div className="public-console-top"><span className="public-console-label">PROJECT 001 / OPERATING RECORD</span><span className="public-console-status"><i /> LIVE</span></div>
            <div className="public-console-title"><span>Where the music is taking shape.</span><b>42%</b></div>
            <div className="public-progress"><span /></div>
            <div className="public-console-grid">
              <div><span>PEOPLE</span><strong>07</strong><small>whole room</small></div>
              <div><span>BEATS</span><strong>24</strong><small>in catalogue</small></div>
              <div><span>TRACKS</span><strong>08</strong><small>in motion</small></div>
            </div>
            <div className="public-waveform" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="public-console-footer"><span><ActivityIcon size={14} /> Latest movement</span><b>Project 001 is in session</b></div>
          </div>
          <div className="public-floating-chip public-floating-chip-one"><span className="public-chip-mark"><MusicIcon size={14} /></span><span><b>Beats</b><small>sound in view</small></span></div>
          <div className="public-floating-chip public-floating-chip-two"><span className="public-chip-mark orange"><CheckCircleIcon size={14} /></span><span><b>One shared record</b><small>nothing gets lost</small></span></div>
        </div>
      </section>

      <section className="public-section public-problem" id="product">
        <div className="public-section-intro">
          <div className="public-eyebrow">THE PROBLEM</div>
          <h2>Great music should not be held together by memory.</h2>
        </div>
        <div className="public-problem-copy">
          <p>Music projects are often fragmented across WhatsApp, Drive, spreadsheets, notebooks, and the heads of the people trying to keep everything moving.</p>
          <p>KREYOH creates one shared operating record so the creative work and the venture behind it can move with clarity, context, and momentum.</p>
          <a href="#records" className="public-text-link">See what comes together <ArrowUpRight size={15} /></a>
        </div>
      </section>

      <section className="public-section public-record-section" id="records">
        <div className="public-section-heading">
          <div><div className="public-eyebrow">ONE PROJECT. ONE SHARED RECORD.</div><h2>Everything behind the music, in view.</h2></div>
          <p>KREYOH gives every contributor a clearer way to see the work, make the next decision, and keep the project moving.</p>
        </div>
        <div className="public-record-grid">
          {records.map((record, index) => {
            const Icon = record.icon;
            return <article className="public-record-card" key={record.title}><span className="public-record-number">{String(index + 1).padStart(2, "0")}</span><span className="public-record-icon"><Icon size={20} /></span><h3>{record.title}</h3><p>{record.detail}</p><ArrowUpRight size={15} className="public-record-arrow" /></article>;
          })}
        </div>
      </section>

      <section className="public-section public-roles-section">
        <div className="public-role-visual"><AmbientMusicAtmosphere variant="sessions" /><div className="public-role-ring ring-one" /><div className="public-role-ring ring-two" /><div className="public-role-mark"><KreyohMark size={86} /></div><span className="public-role-orbit-label">THE WHOLE ROOM</span></div>
        <div className="public-roles-copy"><div className="public-eyebrow">BUILT FOR THE WHOLE ROOM</div><h2>Different roles. One shared way of working.</h2><p>Artists, producers, engineers, A&amp;R, project leads, finance, and admin can each see what matters to them without losing sight of the whole venture.</p><div className="public-role-list">{roles.map((role) => <span key={role}>{role}</span>)}</div></div>
      </section>

      <section className="public-section public-how-section" id="how-it-works">
        <div className="public-section-heading"><div><div className="public-eyebrow">HOW IT WORKS</div><h2>From first spark to release.</h2></div><p>The project journey becomes a visible sequence of creative work, operating decisions, and protected contribution.</p></div>
        <div className="public-journey-grid">{journey.map(([number, title, detail], index) => <div className={index === 0 ? "public-journey-step is-first" : "public-journey-step"} key={title}><span>{number}</span><div className="public-journey-line" /><h3>{title}</h3><p>{detail}</p></div>)}</div>
      </section>

      <section className="public-project-section" id="project-001">
        <AmbientMusicAtmosphere variant="journey" />
        <div className="public-project-copy"><div className="public-eyebrow">PROJECT 001</div><h2>The founding implementation and operating laboratory for KREYOH.</h2><p>Project 001 is where the system is being shaped in the real world — with real people, real records, real sessions, and the honest complexity of building a music venture from the ground up.</p><Link href="/login" className="public-button public-button-primary">Enter the workspace <ArrowUpRight size={16} /></Link></div>
        <div className="public-project-stamp"><span>001</span><small>FOUNDING<br />IMPLEMENTATION</small></div>
      </section>

      <section className="public-section public-about-section" id="about">
        <div><div className="public-eyebrow">ABOUT KREYOH</div><h2>Creative work deserves operating infrastructure.</h2></div>
        <div className="public-about-copy"><p>KREYOH is a music venture operating system built for the space between an idea and a finished release. It helps creative teams turn movement into a record, a record into decisions, and decisions into a venture that can repeat.</p><div className="public-about-signature"><span>Part of</span><strong>FACKTS Africa Group</strong></div></div>
            </section>

      <footer className="public-footer">
        <Link href="/" className="public-footer-brand">
          <KreyohLogo size={30} showTagline={false} />
        </Link>

        <span>
          © {new Date().getFullYear()} KREYOH · FACKTS Africa Group
        </span>

        <div>
          <a href="#top">Back to top ↑</a>
          <Link href="/login">Sign In</Link>
        </div>
      </footer>
    </main>
  );
}