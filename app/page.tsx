"use client";

import { useState } from "react";
import Link from "next/link";
import AmbientMusicAtmosphere from "../components/AmbientMusicAtmosphere";
import { FacktsMusicLogo } from "../components/Branding";
import { ArrowUpRight, CheckCircleIcon, DiscIcon, MicIcon, MusicIcon, UsersIcon } from "../components/Icons";

const capabilities = [
  ["Run creative projects", "Keep people, decisions and delivery moving together.", UsersIcon],
  ["Develop beats", "Listen, claim a development slot and move promising ideas forward.", MusicIcon],
  ["Coordinate the room", "Give artists, producers, A&R and engineers the right view.", CheckCircleIcon],
  ["Record contributions", "Build a dependable creative history around every track.", DiscIcon],
  ["Manage sessions", "Schedule the room, capture outcomes and assign what happens next.", MicIcon],
];

const roles = ["Artists", "Producers", "A&R", "Engineers", "Project Leads"];

export default function PublicHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <main className="public-site">
      <header className="public-nav-wrap">
        <div className="public-nav">
          <Link href="/" className="public-brand" aria-label="FACKTS Music home" onClick={close}>
            <FacktsMusicLogo size={38} showTagline={false} />
          </Link>
          <nav className="public-nav-links" aria-label="Public navigation">
            <a href="#product">What it does</a>
            <a href="#built-for">Built for</a>
            <a href="#project-001">Project 001</a>
            <Link href="/login">Sign In</Link>
            <Link href="/signup" className="public-nav-cta">Create Account <ArrowUpRight size={14} /></Link>
          </nav>
          <button type="button" className={menuOpen ? "public-menu-trigger is-open" : "public-menu-trigger"} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation"><span /><span /><span /></button>
        </div>
        <nav className={menuOpen ? "public-mobile-menu is-open" : "public-mobile-menu"} aria-label="Mobile navigation">
          <a href="#product" onClick={close}>What it does</a>
          <a href="#built-for" onClick={close}>Built for</a>
          <a href="#project-001" onClick={close}>Project 001</a>
          <Link href="/login" onClick={close}>Sign In</Link>
          <Link href="/signup" className="public-mobile-cta" onClick={close}>Create Account <ArrowUpRight size={15} /></Link>
        </nav>
      </header>

      <section className="public-hero" id="top">
        <AmbientMusicAtmosphere variant="intro" />
        <div className="public-hero-grain" aria-hidden="true" />
        <div className="public-hero-content">
          <div className="public-eyebrow"><span className="public-live-dot" /> A FACKTS AFRICA PLATFORM</div>
          <h1>Move the music.<br /><span>Run the venture.</span></h1>
          <p className="public-hero-lead">FACKTS Music brings beats, people, sessions, actions and creative decisions into one living project workspace.</p>
          <div className="public-hero-actions">
            <Link href="/signup" className="public-button public-button-primary">Create Account <ArrowUpRight size={16} /></Link>
            <Link href="/login" className="public-button public-button-ghost">Sign In <ArrowUpRight size={16} /></Link>
          </div>
          <div className="public-hero-note"><span>Built in Nairobi</span><span className="public-note-line" /><span>Made for the whole creative room.</span></div>
        </div>
        <div className="public-hero-stage" aria-label="FACKTS Music identity">
          <div className="public-stage-orbit public-stage-orbit-one" />
          <div className="public-stage-orbit public-stage-orbit-two" />
          <div className="fackts-hero-media">
            <video className="fackts-hero-video" autoPlay loop muted playsInline preload="auto" poster="/branding/fackts-music-logo.png" aria-label="Animated FACKTS Music premium orbit logo">
              <source src="/branding/fackts-music-premium-orbit.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="public-floating-chip public-floating-chip-one"><span className="public-chip-mark"><MusicIcon size={14} /></span><span><b>Beats in motion</b><small>listen · claim · develop</small></span></div>
          <div className="public-floating-chip public-floating-chip-two"><span className="public-chip-mark orange"><CheckCircleIcon size={14} /></span><span><b>One shared record</b><small>nothing gets lost</small></span></div>
        </div>
      </section>

      <section className="public-section public-record-section" id="product">
        <div className="public-section-heading"><div><div className="public-eyebrow">WHAT FACKTS MUSIC DOES</div><h2>Creative momentum, made visible.</h2></div><p>Simple enough for artists on a phone. Strong enough for the people responsible for the whole project.</p></div>
        <div className="public-record-grid">
          {capabilities.map(([title, detail, Icon], index) => <article className="public-record-card" key={String(title)}><span className="public-record-number">{String(index + 1).padStart(2, "0")}</span><span className="public-record-icon"><Icon size={20} /></span><h3>{String(title)}</h3><p>{String(detail)}</p></article>)}
        </div>
      </section>

      <section className="public-section public-roles-section" id="built-for">
        <div className="public-role-visual"><AmbientMusicAtmosphere variant="sessions" /><div className="public-role-ring ring-one" /><div className="public-role-ring ring-two" /><div className="public-role-mark public-role-media"><video autoPlay loop muted playsInline preload="auto" poster="/branding/fackts-music-logo.png" aria-label="Animated FACKTS Music audio reactive logo"><source src="/branding/fackts-music-audio-reactive.mp4" type="video/mp4" /></video></div><span className="public-role-orbit-label">THE WHOLE ROOM</span></div>
        <div className="public-roles-copy"><div className="public-eyebrow">BUILT FOR THE PEOPLE MAKING THE MUSIC</div><h2>Different roles. One project truth.</h2><p>Every participant sees what matters to them, while Project Leads and A&R keep the music moving without turning the process into office software.</p><div className="public-role-list">{roles.map(role => <span key={role}>{role}</span>)}</div></div>
      </section>

      <section className="public-project-section" id="project-001">
        <AmbientMusicAtmosphere variant="journey" />
        <div className="public-project-copy"><div className="public-eyebrow">PROJECT 001</div><h2>Built in the real world, with the real room.</h2><p>Project 001 is the founding implementation of FACKTS Music: the place where the operating system is shaped by actual artists, producers, sessions and decisions.</p><Link href="/signup" className="public-button public-button-primary">Join FACKTS Music <ArrowUpRight size={16} /></Link></div>
        <div className="public-project-stamp"><span>001</span><small>FOUNDING<br />IMPLEMENTATION</small></div>
      </section>

      <footer className="public-footer"><Link href="/" className="public-footer-brand"><FacktsMusicLogo size={34} showTagline={false} /></Link><span>© {new Date().getFullYear()} FACKTS Music — a FACKTS Africa platform</span><div><a href="#top">Back to top ↑</a><Link href="/login">Sign In</Link></div></footer>
    </main>
  );
}
