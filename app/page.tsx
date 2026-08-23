import type { Metadata } from "next";
import Link from "next/link";
import AmbientMusicAtmosphere from "../components/AmbientMusicAtmosphere";
import InstallAppButton from "../components/InstallAppButton";
import PublicNavigation from "../components/PublicNavigation";
import PublicFooter from "../components/PublicFooter";
import { ArrowUpRight, CheckCircleIcon, DiscIcon, MicIcon, MusicIcon, UsersIcon } from "../components/Icons";

export const metadata: Metadata = { title:"FACKTS Music | Creative Momentum, Made Visible", description:"Run creative music projects, develop beats and tracks, coordinate collaborators, manage studio sessions, and build trusted creative records.", alternates:{canonical:"/"}, openGraph:{title:"FACKTS Music — Creative Momentum, Made Visible",description:"Infrastructure for people actually creating music together.",url:"/",siteName:"FACKTS Music",type:"website",images:[{url:"/branding/fackts-music-logo.png",width:1250,height:1250,alt:"FACKTS Music"}]}};

const momentum=[
  {number:"01",title:"Run creative projects",copy:"Bring the people, music, responsibilities and progress of a creative project into one shared workspace.",facts:["Artists & producers","Tracks & files","Sessions","Actions & deadlines"],href:"/projects",cta:"Explore Projects",tone:"project"},
  {number:"02",title:"Keep people & decisions together",copy:"Keep assignments, feedback, roles and decisions visible instead of losing the project inside scattered chats.",facts:["Assignments","Comments","Decisions","Activity"],href:"/#workflow",cta:"See How It Works",tone:"people"},
  {number:"03",title:"Keep delivery moving",copy:"Move music from an idea through beat development, studio sessions, contribution records and release readiness.",facts:["Idea","Beat","Studio","Release ready"],href:"/#workflow",cta:"View the Workflow",tone:"delivery"},
  {number:"04",title:"Build a creative record",copy:"Turn real project participation into a trusted history of work, credits, projects and approved contributions.",facts:["Projects","Credits","Contributions","Future EPKs"],href:"/about",cta:"Creator Profiles",tone:"record"},
];
const capabilities=[
  ["Projects","Organise creative ventures from idea to completion.",UsersIcon],
  ["Beats & Track Development","Discover, claim, develop and organise the music.",MusicIcon],
  ["Collaboration","Give every person in the room a useful working view.",CheckCircleIcon],
  ["Studio Sessions","Coordinate recording, outcomes and follow-up work.",MicIcon],
  ["Credits & Contributions","Build a clearer record of who contributed what.",DiscIcon],
  ["Creator Development","Build professional histories from real creative work.",ArrowUpRight],
] as const;
const roles=[
  ["Artists","Find beats, receive feedback and see what needs your voice."],
  ["Producers","Share music, manage claims and move tracks into development."],
  ["Songwriters & Composers","Shape lyrics, melodies and composition while preserving contribution history."],
  ["A&R","Guide combinations, reviews, sessions and musical direction."],
  ["Engineers & Technical Teams","See sessions, files, recording, mix and master stages without the clutter."],
  ["Managers","Coordinate artist priorities, opportunities, communication and delivery."],
  ["Videographers & Photographers","Follow creative briefs, shoot dates, assets and approved project media."],
  ["Designers & Visual Creatives","Connect artwork, identity and campaign visuals to the right project."],
  ["Content & Media Teams","Turn project movement into organised stories, campaigns and approved content."],
  ["Rights & Finance Teams","Follow contributions, documentation, costs and commercial records with clarity."],
  ["Project Leads","Keep people, deadlines, decisions and delivery moving."],
  ["Studios, Labels & Collectives","Operate the whole room from one shared record while every role sees what matters."],
];
const workflow=["Idea","Beat","Development","Studio","Review","Release Ready"];

export default function PublicHomePage(){return <main className="public-site"><PublicNavigation/>
  <section className="public-hero" id="top"><AmbientMusicAtmosphere variant="intro"/><div className="public-hero-grain" aria-hidden="true"/><div className="public-hero-content"><div className="public-eyebrow"><span className="public-live-dot"/> A FACKTS AFRICA PLATFORM</div><h1>Move the music.<br/><span>Run the venture.</span></h1><p className="public-hero-lead">FACKTS Music brings beats, people, sessions, actions and creative decisions into one living project workspace.</p><div className="public-hero-actions"><Link href="/signup" className="public-button public-button-primary">Create Account <ArrowUpRight size={16}/></Link><Link href="/login" className="public-button public-button-ghost">Sign In <ArrowUpRight size={16}/></Link><InstallAppButton/></div><div className="public-hero-note"><span>Built in Nairobi</span><span className="public-note-line"/><span>Made for the whole creative room.</span></div></div><div className="public-hero-stage" aria-label="FACKTS Music identity"><div className="public-stage-orbit public-stage-orbit-one"/><div className="public-stage-orbit public-stage-orbit-two"/><div className="fackts-hero-media"><video className="fackts-hero-video" autoPlay loop muted playsInline preload="auto" poster="/branding/fackts-music-logo.png" aria-label="Animated FACKTS Music premium orbit logo"><source src="/branding/fackts-music-premium-orbit.mp4" type="video/mp4"/></video></div><div className="public-floating-chip public-floating-chip-one"><span className="public-chip-mark"><MusicIcon size={14}/></span><span><b>Beats in motion</b><small>listen · claim · develop</small></span></div><div className="public-floating-chip public-floating-chip-two"><span className="public-chip-mark orange"><CheckCircleIcon size={14}/></span><span><b>One shared record</b><small>nothing gets lost</small></span></div></div></section>

  <section className="public-section momentum-editorial" id="product"><div className="public-section-heading momentum-heading"><div><div className="public-eyebrow">CREATIVE MOMENTUM, MADE VISIBLE</div><h2>The work is alive.<br/>The system should be too.</h2></div><p>FACKTS Music turns the movement around a song or creative venture into something the whole team can understand, act on and build from.</p></div><div className="momentum-feature-grid">{momentum.map(item=><article className={`momentum-feature momentum-${item.tone}`} key={item.number}><div className="momentum-texture" aria-hidden="true"/><span className="momentum-number">{item.number}</span><div className="momentum-feature-copy"><h3>{item.title}</h3><p>{item.copy}</p><div className="momentum-facts">{item.facts.map(fact=><span key={fact}>{fact}</span>)}</div>{item.href.includes("#")?<a href={item.href}>{item.cta} <ArrowUpRight size={14}/></a>:<Link href={item.href}>{item.cta} <ArrowUpRight size={14}/></Link>}</div></article>)}</div></section>

  <section className="public-section capability-editorial"><div className="public-section-heading"><div><div className="public-eyebrow">WHAT FACKTS MUSIC DOES</div><h2>One creative room.<br/>Six connected systems.</h2></div><p>Each part is useful on its own. Together, they give creative work a dependable operating memory.</p></div><div className="capability-editorial-grid">{capabilities.map(([title,copy,Icon],i)=><article key={title}><span className="capability-icon"><Icon size={21}/></span><small>0{i+1}</small><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

  <section className="public-section public-roles-section" id="built-for"><div className="public-role-visual"><AmbientMusicAtmosphere variant="sessions"/><div className="public-role-ring ring-one"/><div className="public-role-ring ring-two"/><div className="public-role-mark public-role-media"><video autoPlay loop muted playsInline preload="auto" poster="/branding/fackts-music-logo.png" aria-label="Animated FACKTS Music audio reactive logo"><source src="/branding/fackts-music-audio-reactive.mp4" type="video/mp4"/></video></div><span className="public-role-orbit-label">THE WHOLE ROOM</span></div><div className="public-roles-copy"><div className="public-eyebrow">BUILT FOR THE PEOPLE MAKING THE MUSIC</div><h2>Different roles. One project truth.</h2><p>Every participant sees what matters to them, while Project Leads and A&R keep the music moving without turning the process into office software.</p><div className="role-explanation-grid">{roles.map(([role,copy])=><details key={role}><summary>{role}</summary><p>{copy}</p></details>)}</div></div></section>

  <section className="public-workflow-section" id="workflow"><div><span className="public-eyebrow">HOW IT WORKS</span><h2>From first spark to release readiness.</h2><p>Simple enough to follow. Structured enough to repeat.</p></div><ol className="public-workflow-line">{workflow.map((step,index)=><li key={step}><span>{String(index+1).padStart(2,"0")}</span><strong>{step}</strong></li>)}</ol></section>

  <section className="public-project-section" id="project-001"><AmbientMusicAtmosphere variant="journey"/><div className="public-project-copy"><div className="public-eyebrow">BUILT IN THE REAL WORLD</div><h2>Built through real creative projects.</h2><p>FACKTS Music is being developed from the realities of working artists, producers, project leads and studio teams. Project 001 is helping shape the workflows, tools and decisions the platform needs to solve.</p><Link href="/signup" className="public-button public-button-primary">Join FACKTS Music <ArrowUpRight size={16}/></Link></div><div className="public-project-stamp"><span>001</span><small>FOUNDING<br/>IMPLEMENTATION</small></div></section>

  <section className="public-about-preview"><div className="about-preview-index">03<span>YEARS<br/>LISTENING</span></div><div><span className="public-eyebrow">ABOUT FACKTS MUSIC</span><h2>We spent years listening before building.</h2><p>FACKTS Music grew through artist interviews, creator profiling, EPK work, industry conversations, music content and real creative projects. A recurring problem became clear: creative work happens everywhere, but the systems around it are fragmented.</p><Link href="/about" className="public-editorial-link">About FACKTS Music <ArrowUpRight size={15}/></Link></div></section>

  <section className="public-partner-preview"><div><span className="public-eyebrow">PARTNER WITH FACKTS MUSIC</span><h2>Building something for creators? Let’s build together.</h2></div><div><p>We welcome studios, labels, collectives, brands, agencies, media, cultural organisations and technology partners who want creative work to move better.</p><Link href="/partner" className="public-button public-button-primary">Partner With Us <ArrowUpRight size={16}/></Link></div></section>

  <section className="public-contact-preview"><div><span className="public-eyebrow">FIND THE ROOM</span><h2>Nairobi-built.<br/>Open to the creative world.</h2></div><div className="public-contact-details"><a href="mailto:info@facktsafrica.co.ke">info@facktsafrica.co.ke</a><a href="tel:+254711468303">+254 711 468 303</a><address>3rd Floor, Krishna Centre<br/>Westlands, Nairobi, Kenya</address><span>Open Monday–Saturday · Closed Sundays</span><Link href="/contact">Contact FACKTS Music <ArrowUpRight size={14}/></Link></div></section>
  <PublicFooter/>
</main>}
