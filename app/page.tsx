import type { Metadata } from "next";
import Link from "next/link";
import PublicNavigation from "../components/PublicNavigation";
import PublicFooter from "../components/PublicFooter";
import { ArrowUpRight, CheckCircleIcon, DiscIcon, MicIcon, MusicIcon, UsersIcon } from "../components/Icons";
import { createAdminClient } from "../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "FACKTS Music | Make Music. Build the World Around It.",
  description: "A living operating platform for African music creation — creators, projects, beats, sessions, credits and discovery.",
  alternates: { canonical: "/" },
};

type PublicCreator = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  hero: string;
  tagline: string;
  location: string;
  skills: string[];
  slug: string;
  interviewTitle: string;
  interviewUrl: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function scoreCreator(row: any) {
  let score = 0;
  if (text(row.avatar_url)) score += 6;
  if (text(row.hero_image_url)) score += 4;
  if (text(row.epk_tagline) || text(row.bio)) score += 3;
  if (list(row.creator_types).length) score += 3;
  if (list(row.skills_genres).length) score += 2;
  if (text(row.location)) score += 1;
  if (text(row.interview_url)) score += 2;
  return score;
}

async function getPublicCreators(): Promise<PublicCreator[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id,stage_name,nickname,avatar_url,hero_image_url,epk_tagline,bio,location,skills_genres,creator_types,public_slug,profile_visibility,account_status,interview_title,interview_url")
      .eq("profile_visibility", "public")
      .eq("account_status", "active")
      .limit(80);

    if (error) {
      console.error("Public homepage creator query failed:", error);
      return [];
    }

    return ((data ?? []) as any[])
      .map((row) => {
        const name = text(row.stage_name) || text(row.nickname);
        return {
          id: text(row.id),
          name,
          role: list(row.creator_types).slice(0, 2).join(" · ") || "Creator",
          avatar: text(row.avatar_url),
          hero: text(row.hero_image_url),
          tagline: text(row.epk_tagline) || text(row.bio),
          location: text(row.location),
          skills: list(row.skills_genres),
          slug: text(row.public_slug) || text(row.id),
          interviewTitle: text(row.interview_title),
          interviewUrl: text(row.interview_url),
          _score: scoreCreator(row),
        };
      })
      .filter((row) => row.id && row.name && row.name !== "FACKTS Music Creator")
      .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
      .map(({ _score, ...row }) => row)
      .slice(0, 12);
  } catch (error) {
    console.error("Public homepage creator exception:", error);
    return [];
  }
}

const systems = [
  { number: "01", title: "Creators", copy: "Public identities that grow with real work, credits, media and project history.", icon: UsersIcon },
  { number: "02", title: "Projects", copy: "One place for people, direction, decisions and delivery around a creative venture.", icon: CheckCircleIcon },
  { number: "03", title: "Sessions", copy: "Studio activity, contributors, outcomes and follow-up without losing the thread.", icon: MicIcon },
  { number: "04", title: "Credits", copy: "A clearer record of who made what — built from participation instead of memory.", icon: DiscIcon },
];

const flow = ["IDEA", "BEAT", "BUILD", "STUDIO", "REVIEW", "RELEASE READY"];

export default async function PublicHomePage() {
  const creators = await getPublicCreators();
  const featured = creators.slice(0, 6);
  const ticker = creators.length ? [...creators, ...creators] : [];
  const interviews = creators.filter((creator) => creator.interviewUrl).slice(0, 3);

  return (
    <main className="public-site fm-v3-site">
      <PublicNavigation />

      <section className="fm-v3-hero" id="top">
        <div className="fm-v3-hero-noise" aria-hidden="true" />
        <div className="fm-v3-hero-grid" aria-hidden="true" />
        <div className="fm-v3-hero-glow fm-v3-hero-glow-a" aria-hidden="true" />
        <div className="fm-v3-hero-glow fm-v3-hero-glow-b" aria-hidden="true" />

        <div className="fm-v3-hero-copy">
          <div className="fm-v3-kicker"><span /> FACKTS MUSIC · NAIROBI / AFRICA</div>
          <h1>Make music.<br /><em>Build the world</em><br />around it.</h1>
          <p>
            FACKTS Music is the operating platform around creative work — connecting creators, projects,
            sessions, credits and discovery without flattening the culture into office software.
          </p>
          <div className="fm-v3-hero-actions">
            <Link href="/signup" className="fm-v3-btn fm-v3-btn-primary">Join FACKTS Music <ArrowUpRight size={16} /></Link>
            <Link href="/creators" className="fm-v3-btn fm-v3-btn-ghost">Meet the creators <ArrowUpRight size={16} /></Link>
          </div>
          <div className="fm-v3-hero-foot">
            <span>Built in Nairobi</span>
            <span>Creators first</span>
            <span>Projects in motion</span>
          </div>
        </div>

        <div className="fm-v3-hero-world" aria-label="FACKTS Music visual world">
          <div className="fm-v3-frame fm-v3-frame-main">
            <img src="/branding/fackts-creative-community.jpg" alt="FACKTS Music creative community" />
            <span className="fm-v3-frame-tag">THE CREATIVE ROOM</span>
          </div>
          <div className="fm-v3-frame fm-v3-frame-top">
            <img src="/branding/fackts-creator-red-wide.jpg" alt="FACKTS Music creator" />
          </div>
          <div className="fm-v3-frame fm-v3-frame-bottom">
            <img src="/branding/fackts-creator-sky.jpg" alt="FACKTS Music creator" />
          </div>
          <div className="fm-v3-orbit-card">
            <video autoPlay loop muted playsInline preload="metadata" poster="/branding/fackts-music-logo.png">
              <source src="/branding/fackts-music-premium-orbit.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="fm-v3-live-chip"><span /> LIVE PLATFORM</div>
        </div>
      </section>

      <section className="fm-v3-ticker-section" aria-label="FACKTS Music creator network">
        <div className="fm-v3-ticker-label">LIVE ON FACKTS MUSIC</div>
        {ticker.length ? (
          <div className="fm-v3-ticker-window">
            <div className="fm-v3-ticker-track">
              {ticker.map((creator, index) => (
                <Link href={`/creators/${encodeURIComponent(creator.slug)}`} key={`${creator.id}-${index}`} className="fm-v3-ticker-item">
                  {creator.avatar ? <img src={creator.avatar} alt="" /> : <span className="fm-v3-ticker-dot" />}
                  <strong>{creator.name}</strong><small>{creator.role}</small>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="fm-v3-ticker-empty">Creator network loading from the live platform.</div>
        )}
      </section>

      <section className="fm-v3-section fm-v3-systems" id="how-it-works">
        <div className="fm-v3-section-head">
          <div><span className="fm-v3-eyebrow">THE OPERATING LAYER</span><h2>The room is creative.<br />The structure can be too.</h2></div>
          <p>FACKTS Music keeps the energy of the studio while making the work easier to see, coordinate and build on.</p>
        </div>
        <div className="fm-v3-system-grid">
          {systems.map(({ number, title, copy, icon: Icon }) => (
            <article className="fm-v3-system-card" key={title}>
              <div className="fm-v3-system-top"><span>{number}</span><Icon size={22} /></div>
              <h3>{title}</h3><p>{copy}</p>
              <div className="fm-v3-system-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="fm-v3-section fm-v3-creators">
        <div className="fm-v3-section-head fm-v3-section-head-creators">
          <div><span className="fm-v3-eyebrow">PUBLIC CREATOR NETWORK</span><h2>Real people.<br />Real creative identities.</h2></div>
          <div><p>Public creator profiles come directly from FACKTS Music — not placeholder cards.</p><Link href="/creators" className="fm-v3-text-link">Explore all creators <ArrowUpRight size={14} /></Link></div>
        </div>

        <div className="fm-v3-creator-grid">
          {featured.length ? featured.map((creator, index) => (
            <Link href={`/creators/${encodeURIComponent(creator.slug)}`} className="fm-v3-creator-card" key={creator.id}>
              <div className="fm-v3-creator-photo">
                {(creator.hero || creator.avatar) ? <img src={creator.hero || creator.avatar} alt={creator.name} /> : <span>{creator.name.slice(0,2).toUpperCase()}</span>}
                <div className="fm-v3-creator-photo-shade" />
                <span className="fm-v3-creator-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="fm-v3-creator-role">{creator.role}</span>
              </div>
              <div className="fm-v3-creator-copy">
                <h3>{creator.name}</h3>
                <p>{creator.tagline || creator.skills.slice(0, 3).join(" · ") || "Public creator on FACKTS Music."}</p>
                <div><span>{creator.location || "FACKTS Music"}</span><b>View profile ↗</b></div>
              </div>
            </Link>
          )) : (
            <article className="fm-v3-empty-card"><MusicIcon size={24}/><h3>Creator network</h3><p>Public profiles will appear here as creators make them shareable.</p></article>
          )}
        </div>
      </section>

      <section className="fm-v3-project-001">
        <div className="fm-v3-project-image"><img src="/branding/fackts-monnokid-workspace.jpg" alt="FACKTS Music studio work" /><div /></div>
        <div className="fm-v3-project-copy">
          <span className="fm-v3-eyebrow">PROJECT 001 · FOUNDING IMPLEMENTATION</span>
          <h2>Built inside the work, not outside it.</h2>
          <p>FACKTS Music is being shaped by the realities of artists, producers, engineers, A&R and project operators working through an actual creative venture.</p>
          <div className="fm-v3-project-stats">
            <div><strong>PEOPLE</strong><span>Roles stay visible.</span></div>
            <div><strong>SESSIONS</strong><span>Progress stays connected.</span></div>
            <div><strong>CREDITS</strong><span>Contribution becomes history.</span></div>
          </div>
          <Link href="/about" className="fm-v3-text-link">Why FACKTS Music exists <ArrowUpRight size={14}/></Link>
        </div>
      </section>

      <section className="fm-v3-flow-section">
        <div className="fm-v3-flow-intro"><span className="fm-v3-eyebrow">FROM SPARK TO RECORD</span><h2>One continuous creative memory.</h2></div>
        <ol className="fm-v3-flow">
          {flow.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><i /></li>)}
        </ol>
      </section>

      {interviews.length ? (
        <section className="fm-v3-section fm-v3-watch">
          <div className="fm-v3-section-head"><div><span className="fm-v3-eyebrow">WATCH THE PEOPLE</span><h2>Conversations from inside the culture.</h2></div><p>Selected creator interviews and public conversations from profiles across FACKTS Music.</p></div>
          <div className="fm-v3-watch-grid">
            {interviews.map((creator) => (
              <a href={creator.interviewUrl} target="_blank" rel="noreferrer" className="fm-v3-watch-card" key={creator.id}>
                <div><img src={creator.hero || creator.avatar || "/branding/fackts-creative-community.jpg"} alt=""/><span className="fm-v3-play">▶</span></div>
                <span>{creator.name}</span>
                <h3>{creator.interviewTitle || `Meet ${creator.name}`}</h3>
                <small>Watch conversation ↗</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fm-v3-partner-band">
        <div><span className="fm-v3-eyebrow">STUDIOS · BRANDS · LABELS · COLLECTIVES</span><h2>Build with the platform,<br />not just the moment.</h2></div>
        <div><p>Partner around creator development, project infrastructure, studio activity, discovery, live experiences and cultural storytelling.</p><Link href="/partner" className="fm-v3-btn fm-v3-btn-primary">Partner with FACKTS Music <ArrowUpRight size={16}/></Link></div>
      </section>

      <PublicFooter />
    </main>
  );
}
