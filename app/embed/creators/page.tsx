import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  id?: string | null;
  stage_name?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  hero_image_url?: string | null;
  epk_tagline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills_genres?: unknown;
  top_songs?: unknown;
  achievements?: unknown;
  creator_types?: unknown;
  public_slug?: string | null;
  profile_visibility?: string | null;
  account_status?: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function displayName(profile: ProfileRow) {
  return text(profile.stage_name) || text(profile.nickname) || "FACKTS Music Creator";
}

function imageUrl(profile: ProfileRow) {
  return text(profile.avatar_url) || text(profile.hero_image_url);
}

function completenessScore(profile: ProfileRow) {
  let score = 0;
  if (imageUrl(profile)) score += 10;
  if (text(profile.epk_tagline) || text(profile.bio)) score += 4;
  if (stringArray(profile.creator_types).length) score += 4;
  if (text(profile.location)) score += 2;
  if (stringArray(profile.skills_genres).length) score += 2;
  if (Array.isArray(profile.top_songs) && profile.top_songs.length) score += 4;
  if (stringArray(profile.achievements).length) score += 2;
  if (text(profile.public_slug)) score += 1;
  return score;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "FM";
}

async function loadCreators() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id,stage_name,nickname,avatar_url,hero_image_url,epk_tagline,bio,location,skills_genres,top_songs,achievements,creator_types,public_slug,profile_visibility,account_status"
    )
    .eq("profile_visibility", "public")
    .eq("account_status", "active")
    .limit(100);

  if (error) {
    console.error("Creator embed query failed:", error);
    return [] as ProfileRow[];
  }

  const rows = (data ?? []) as unknown as ProfileRow[];

  return rows
    .filter((profile) => {
      const name = displayName(profile);
      return Boolean(profile.id) && Boolean(text(profile.public_slug)) && name !== "FACKTS Music Creator";
    })
    .sort((left, right) => completenessScore(right) - completenessScore(left))
    .slice(0, 3);
}

export default async function CreatorEmbedPage() {
  const creators = await loadCreators();

  return (
    <main className="fm-embed-shell">
      <style>{`
        html, body { margin: 0; padding: 0; background: transparent !important; color: #fff; overflow-x: hidden; }
        * { box-sizing: border-box; }
        .fm-embed-shell { width: 100%; min-height: 100%; background: transparent; font-family: Arial, Helvetica, sans-serif; }
        .fm-embed-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .fm-creator { display: flex; min-width: 0; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,.13); border-radius: 18px; background: linear-gradient(180deg, rgba(30,22,39,.98), rgba(10,9,14,.98)); color: #fff; text-decoration: none; transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
        .fm-creator:hover { transform: translateY(-3px); border-color: rgba(189,119,255,.54); box-shadow: 0 16px 38px rgba(0,0,0,.28); }
        .fm-photo { position: relative; aspect-ratio: 4 / 4.7; overflow: hidden; background: radial-gradient(circle at 50% 30%, rgba(153,91,255,.25), transparent 62%), #0b0a0f; }
        .fm-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .fm-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 42%, rgba(9,8,12,.88) 100%); pointer-events: none; }
        .fm-initials { position: absolute; inset: 0; display: grid; place-items: center; font-size: 40px; font-weight: 900; letter-spacing: -.04em; color: #d7b8ff; }
        .fm-index { position: absolute; top: 12px; left: 12px; z-index: 2; display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(5,5,8,.76); font-size: 10px; font-weight: 900; }
        .fm-badge { position: absolute; left: 12px; bottom: 12px; z-index: 2; padding: 6px 8px; border: 1px solid rgba(198,143,255,.35); border-radius: 999px; background: rgba(16,10,23,.72); font-size: 8px; font-weight: 900; letter-spacing: .12em; color: #d7b8ff; }
        .fm-copy { display: flex; min-height: 176px; flex: 1; flex-direction: column; padding: 14px; }
        .fm-role { margin: 0 0 7px; color: #c9a5f7; font-size: 9px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
        .fm-copy h3 { margin: 0; font-size: clamp(18px, 2vw, 24px); line-height: 1; letter-spacing: -.03em; }
        .fm-copy p { margin: 10px 0 0; display: -webkit-box; overflow: hidden; -webkit-line-clamp: 3; -webkit-box-orient: vertical; color: #bdb9c5; font-size: 11px; line-height: 1.5; }
        .fm-meta { margin-top: auto; padding-top: 13px; border-top: 1px solid rgba(255,255,255,.09); display: flex; justify-content: space-between; gap: 8px; color: #817c89; font-size: 9px; font-weight: 700; }
        .fm-open { margin-top: 12px; color: #fff; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .fm-empty { min-height: 290px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.12); border-radius: 18px; color: #aaa3b2; font-size: 12px; text-align: center; }
        @media (max-width: 720px) {
          .fm-embed-grid { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 4px; scroll-snap-type: x mandatory; scrollbar-width: none; }
          .fm-embed-grid::-webkit-scrollbar { display: none; }
          .fm-creator { flex: 0 0 min(78vw, 270px); scroll-snap-align: start; }
        }
      `}</style>

      {creators.length ? (
        <div className="fm-embed-grid">
          {creators.map((profile, index) => {
            const id = text(profile.id);
            const name = displayName(profile);
            const slug = text(profile.public_slug) || id;
            const photo = imageUrl(profile);
            const roles = stringArray(profile.creator_types);
            const skills = stringArray(profile.skills_genres);
            const tagline = text(profile.epk_tagline) || text(profile.bio) || "Creator building their public identity through FACKTS Music.";
            const songs = Array.isArray(profile.top_songs) ? profile.top_songs.length : 0;

            return (
              <a
                className="fm-creator"
                href={`/creators/${encodeURIComponent(slug)}`}
                target="_top"
                rel="noreferrer"
                key={id}
              >
                <div className="fm-photo">
                  {photo ? <img src={photo} alt={name} /> : <span className="fm-initials">{initials(name)}</span>}
                  <span className="fm-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="fm-badge">PUBLIC PROFILE</span>
                </div>
                <div className="fm-copy">
                  <div className="fm-role">{roles.length ? roles.slice(0, 2).join(" · ") : "FACKTS MUSIC CREATOR"}</div>
                  <h3>{name}</h3>
                  <p>{tagline}</p>
                  <div className="fm-meta">
                    <span>{text(profile.location) || skills.slice(0, 2).join(" · ") || "FACKTS Music"}</span>
                    {songs ? <span>{songs} selected track{songs === 1 ? "" : "s"}</span> : null}
                  </div>
                  <div className="fm-open">View full creator profile ↗</div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="fm-empty">No public creator profiles are available right now.</div>
      )}
    </main>
  );
}
