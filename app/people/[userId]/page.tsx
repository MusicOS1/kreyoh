import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { creatorDisplayName } from "../../../lib/profileIdentity";
import { getWorkspace } from "../../../lib/workspace";

const first = (value: any) => Array.isArray(value) ? value[0] : value;

function videoEmbed(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("youtube.com")) return `https://www.youtube.com/embed/${parsed.searchParams.get("v") || parsed.pathname.split("/").pop()}`;
    if (parsed.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${parsed.pathname.split("/").filter(Boolean).pop()}`;
  } catch { return null; }
  return null;
}

function songPlayer(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube.com/embed/${parsed.pathname.slice(1).split("/")[0]}` };
    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? { kind: "iframe", src: `https://www.youtube.com/embed/${id}` } : null;
    }
    if (host.includes("spotify.com")) return { kind: "iframe", src: `https://open.spotify.com/embed${parsed.pathname}` };
    if (host.includes("music.apple.com")) return { kind: "iframe", src: `https://embed.music.apple.com${parsed.pathname}${parsed.search}` };
    if (host.includes("soundcloud.com")) return { kind: "iframe", src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23f5a623&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false` };
    if (/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(url)) return { kind: "audio", src: url };
  } catch { return null; }
  return null;
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { admin, project, membership, user } = await getWorkspace();
  if (!project || !membership) return <AppShell><div className="content empty-state"><h2>Project invitation required</h2></div></AppShell>;
  const [{ data: member }, { data: trackCredits = [] }, { data: sessionCredits = [] }] = await Promise.all([
    admin.from("project_members").select("status,joined_at,profiles(*),member_roles(roles(name))").eq("project_id", project.id).eq("user_id", userId).eq("status", "active").maybeSingle(),
    admin.from("track_contributors").select("id,contribution_role,approved,tracks!inner(id,working_title,track_code,project_id)").eq("user_id", userId).eq("tracks.project_id", project.id),
    admin.from("session_contributions").select("id,contribution_type,description,created_at,studio_sessions(starts_at),tracks(working_title)").eq("project_id", project.id).eq("contributor_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!member) notFound();
  const profile = first(member.profiles);
  const name = creatorDisplayName(profile);
  const roles = (member.member_roles || []).map((item: any) => first(item.roles)?.name).filter(Boolean);
  const photos = (profile?.photo_catalog || []).slice(0, 5);
  const embed = videoEmbed(profile?.interview_url);
  const trackCreditRows = trackCredits ?? [];
  const sessionCreditRows = sessionCredits ?? [];

  return <AppShell><div className="content creator-profile-page">
    <section className={`creator-profile-hero${profile?.hero_image_url ? " has-hero-image" : ""}`} style={profile?.hero_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(2,7,13,.96) 0%, rgba(2,7,13,.76) 58%, rgba(2,7,13,.30) 100%), url("${profile.hero_image_url}")` } : undefined}>
      <div className="creator-profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt={name} /> : name.slice(0, 2).toUpperCase()}</div>
      <div><span className="eyebrow">CREATOR PROFILE / PROJECT 001</span><h1>{name}</h1><p>{profile?.epk_tagline || profile?.bio || "A creator building their professional history through FACKTS Music."}</p><div className="person-roles-wrap">{roles.map((role: string) => <span className="role-chip" key={role}>{role}</span>)}</div></div>
      <div className="creator-profile-actions">{profile?.profile_visibility === "public" && <Link className="secondary-button-inline" href={`/creators/${profile.public_slug || userId}`}>Public profile ↗</Link>}{user.id === userId && <Link className="secondary-button-inline" href="/settings">Edit my profile</Link>}</div>
    </section>

    {!!photos.length && <section className="creator-photo-catalog"><div className="creator-section-heading"><span className="eyebrow">PHOTO CATALOGUE</span><h2>Selected images</h2></div><div>{photos.map((photo: string, index: number) => <img src={photo} alt={`${name} catalogue ${index + 1}`} key={photo} />)}</div></section>}

    <section className="creator-profile-grid">
      <article className="panel"><span className="eyebrow">PROFILE</span><h2>Creative identity</h2><p>{profile?.bio || "Bio coming soon."}</p><dl><div><dt>Location</dt><dd>{profile?.location || "Not listed"}</dd></div><div><dt>Skills / genres</dt><dd>{(profile?.skills_genres || []).join(" · ") || "Not listed"}</dd></div></dl>{profile?.social_links?.primary && <a href={profile.social_links.primary} target="_blank" rel="noreferrer">Social profile ↗</a>}{profile?.streaming_links?.primary && <a href={profile.streaming_links.primary} target="_blank" rel="noreferrer">Streaming profile ↗</a>}</article>
      <article className="panel creator-top-five"><span className="eyebrow">TOP FIVE</span><h2>Selected music</h2><div className="creator-song-list">{!(profile?.top_songs || []).length && <p>No selected songs yet.</p>}{(profile?.top_songs || []).map((song: any, index: number) => { const player = songPlayer(song.url); return <div className="creator-song-player" key={`${song.title}-${index}`}><div className="creator-song-heading"><span>{String(index + 1).padStart(2, "0")}</span><strong>{song.title}</strong>{song.url && <a href={song.url} target="_blank" rel="noreferrer">Open ↗</a>}</div>{player?.kind === "iframe" && <iframe src={player.src} title={`${song.title} player`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />}{player?.kind === "audio" && <audio src={player.src} controls preload="none" />}{song.url && !player && <a className="creator-song-fallback" href={song.url} target="_blank" rel="noreferrer">Play on the original platform ↗</a>}</div>; })}</div></article>
    </section>

    {(profile?.interview_url || profile?.interview_title) && <section className="panel creator-interview"><div><span className="eyebrow">FEATURED INTERVIEW</span><h2>{profile?.interview_title || `Meet ${name}`}</h2></div>{embed ? <iframe src={embed} title={profile?.interview_title || `${name} interview`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <a className="secondary-button-inline" href={profile.interview_url} target="_blank" rel="noreferrer">Watch interview ↗</a>}</section>}

    <section className="creator-profile-grid creator-history-grid">
      <article className="panel"><div className="creator-panel-heading"><div><span className="eyebrow">APPROVED CREDITS</span><h2>Music history</h2></div><span>{trackCreditRows.length} records</span></div>{!trackCreditRows.length && <p>No approved track credits yet.</p>}<div className="creator-credit-list">{trackCreditRows.map((credit: any, index: number) => { const track = first(credit.tracks); return <Link href={`/tracks#track-${track?.id}`} className="creator-credit-row premium" key={credit.id}><span className="creator-credit-index">{String(index + 1).padStart(2, "0")}</span><strong>{track?.working_title || "Untitled track"}</strong><span>{credit.contribution_role.replaceAll("_", " ")}</span><b>{credit.approved ? "Approved" : "Recorded"}</b></Link>; })}</div></article>
      <article className="panel"><div className="creator-panel-heading"><div><span className="eyebrow">STUDIO HISTORY</span><h2>Recorded contributions</h2></div><span>{sessionCreditRows.length} records</span></div>{!sessionCreditRows.length && <p>No session contributions recorded yet.</p>}<div className="creator-credit-list">{sessionCreditRows.map((credit: any, index: number) => <div className="creator-credit-row premium studio" key={credit.id}><span className="creator-credit-index">{String(index + 1).padStart(2, "0")}</span><strong>{credit.contribution_type.replaceAll("_", " ")}</strong><span>{first(credit.tracks)?.working_title || "Project session"}</span><small>{new Date(credit.created_at).toLocaleDateString("en-KE")}</small><p>{credit.description}</p></div>)}</div></article>
    </section>
    {!!profile?.achievements?.length && <section className="panel creator-achievements"><span className="eyebrow">HIGHLIGHTS</span><h2>Achievements</h2><ul>{profile.achievements.map((item: string) => <li key={item}>{item}</li>)}</ul></section>}
  </div></AppShell>;
}
