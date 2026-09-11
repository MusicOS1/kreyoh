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
  creator_types?: unknown;
  public_slug?: string | null;
  account_status?: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
}
function displayName(profile: ProfileRow) {
  return text(profile.stage_name) || text(profile.nickname) || "";
}

async function loadCreators() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,stage_name,nickname,avatar_url,hero_image_url,epk_tagline,bio,location,skills_genres,creator_types,public_slug,account_status")
    .eq("profile_visibility", "public")
    .eq("account_status", "active")
    .limit(100);

  if (error) {
    console.error("Creator embed query failed:", error);
    return [] as ProfileRow[];
  }

  return ((data ?? []) as unknown as ProfileRow[])
    .map((profile) => {
      const name = displayName(profile);
      let score = 0;
      if (text(profile.avatar_url) || text(profile.hero_image_url)) score += 6;
      if (text(profile.epk_tagline) || text(profile.bio)) score += 3;
      if (stringArray(profile.creator_types).length) score += 2;
      if (text(profile.location)) score += 1;
      return { profile, name, score };
    })
    .filter((row) => row.profile.id && row.name && text(row.profile.public_slug))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((row) => row.profile);
}

export default async function CreatorEmbedPage() {
  const creators = await loadCreators();

  return (
    <main className="fm-embed-v3">
      <style>{`
        html,body{margin:0!important;padding:0!important;background:transparent!important;overflow-x:hidden!important;color:#fff!important}
        body::before,body::after{display:none!important}
        *{box-sizing:border-box}
        .fm-embed-v3{width:100%;background:transparent;font-family:Arial,Helvetica,sans-serif}
        .fm-e-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .fm-e-card{position:relative;display:block;overflow:hidden;min-width:0;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:#101014;color:#fff;text-decoration:none;transition:transform .28s ease,border-color .28s ease}
        .fm-e-card:hover{transform:translateY(-4px);border-color:rgba(255,138,31,.5)}
        .fm-e-photo{position:relative;aspect-ratio:4/4.1;overflow:hidden;background:radial-gradient(circle at 50% 30%,rgba(140,99,255,.25),transparent 60%),#101014}
        .fm-e-photo img{width:100%;height:100%;object-fit:cover;transition:transform .45s ease}
        .fm-e-card:hover img{transform:scale(1.04)}
        .fm-e-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(7,7,9,.9))}
        .fm-e-number{position:absolute;z-index:2;top:12px;left:12px;width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(7,7,9,.62);font-size:8px;font-weight:900}
        .fm-e-initials{position:absolute;inset:0;display:grid;place-items:center;color:#c7b8ff;font-size:48px;font-weight:950}
        .fm-e-copy{padding:15px 15px 16px}
        .fm-e-role{display:block;margin-bottom:7px;color:#ff9a3c;font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .fm-e-copy h3{margin:0;font-size:clamp(19px,2vw,25px);line-height:1;letter-spacing:-.04em}
        .fm-e-copy p{min-height:51px;margin:9px 0 13px;color:#aaa7b0;font-size:10.5px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .fm-e-meta{display:flex;justify-content:space-between;gap:8px;padding-top:11px;border-top:1px solid rgba(255,255,255,.09);color:#726f78;font-size:8.5px}
        .fm-e-meta b{color:#ddd;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
        .fm-e-empty{display:grid;min-height:230px;place-items:center;border:1px dashed rgba(255,255,255,.16);border-radius:20px;color:#8b8791;font-size:11px}
        @media(max-width:720px){.fm-e-grid{display:flex;overflow-x:auto;gap:10px;padding-bottom:3px;scroll-snap-type:x mandatory;scrollbar-width:none}.fm-e-grid::-webkit-scrollbar{display:none}.fm-e-card{flex:0 0 min(78vw,270px);scroll-snap-align:start}}
      `}</style>
      {creators.length ? (
        <div className="fm-e-grid">
          {creators.map((creator, index) => {
            const id = text(creator.id);
            const name = displayName(creator);
            const slug = text(creator.public_slug) || id;
            const image = text(creator.hero_image_url) || text(creator.avatar_url);
            const role = stringArray(creator.creator_types).slice(0, 2).join(" · ") || "FACKTS MUSIC CREATOR";
            const tagline = text(creator.epk_tagline) || text(creator.bio) || stringArray(creator.skills_genres).slice(0, 2).join(" · ") || "Public creator on FACKTS Music.";
            return (
              <a className="fm-e-card" href={`/creators/${encodeURIComponent(slug)}`} target="_top" rel="noreferrer" key={id}>
                <div className="fm-e-photo">
                  {image ? <img src={image} alt={name} /> : <span className="fm-e-initials">{name.slice(0,2).toUpperCase()}</span>}
                  <span className="fm-e-number">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="fm-e-copy">
                  <span className="fm-e-role">{role}</span>
                  <h3>{name}</h3>
                  <p>{tagline}</p>
                  <div className="fm-e-meta"><span>{text(creator.location) || "FACKTS Music"}</span><b>Profile ↗</b></div>
                </div>
              </a>
            );
          })}
        </div>
      ) : <div className="fm-e-empty">No public creator profiles are available right now.</div>}
    </main>
  );
}
