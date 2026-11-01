import Link from "next/link";
import PublicNavigation from "../../components/PublicNavigation";
import AppShell from "../../components/AppShell";
import {viewer} from "../../lib/community";
import PublicFooter from "../../components/PublicFooter";
import { createAdminClient } from "../../lib/supabase/admin";
import { ArrowUpRight } from "../../components/Icons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 18;
const filters = ["All", "Artist", "Producer", "Engineer", "Songwriter", "Composer", "A&R", "Manager", "Other Creative"];

function cleanSearch(value: unknown) {
  return String(value || "").trim().replace(/[,%()]/g, " ");
}

export default async function PublicCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const params = await searchParams;
  const sessionUser=await viewer();
  const admin = createAdminClient();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const queryText = cleanSearch(params.q);
  const role = filters.includes(String(params.role)) ? String(params.role) : "All";

  // Query public profiles first, then apply a consistent search across names and
  // profile aliases. Exact database ILIKE alone misses alternate spellings.
  const {data:allCreators,error}=await admin.from("profiles")
   .select("id,stage_name,nickname,full_name,avatar_url,hero_image_url,bio,epk_tagline,location,skills_genres,creator_types,public_slug")
   .eq("profile_visibility","public").eq("account_status","active")
   .order("stage_name",{ascending:true,nullsFirst:false}).limit(1000);
  const norm=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g,"").replace(/gh/g,"g");
  const needle=norm(queryText);
  const filtered=(allCreators||[]).filter((creator:any)=>{
   const match=!needle||norm([creator.stage_name,creator.nickname,creator.full_name,creator.public_slug,creator.bio,creator.location,...(creator.skills_genres||[])].filter(Boolean).join(" ")).includes(needle);
   return match&&(role==="All"||(creator.creator_types||[]).includes(role));
  });
  const count=filtered.length;
  const creators=filtered.slice(from,to+1);
  if(error)console.error("Public creator search is unavailable.");
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  const queryFor = (targetPage: number) => {
    const next = new URLSearchParams();
    if (queryText) next.set("q", queryText);
    if (role !== "All") next.set("role", role);
    if (targetPage > 1) next.set("page", String(targetPage));
    const qs = next.toString();
    return `/creators${qs ? `?${qs}` : ""}`;
  };

  const directory=(
    <main className="public-site fm-v3-site fm-creators-page">

      <section className="fm-directory-hero">
        <div className="fm-v3-kicker"><span /> PUBLIC CREATOR NETWORK</div>
        <h1>Find the people<br /><em>moving the sound.</em></h1>
        <p>Artists, producers, engineers, songwriters and the wider creative room — public profiles built from real participation inside FACKTS Music.</p>

        <form className="fm-directory-search">
          <input name="q" defaultValue={queryText} placeholder="Search creators, sound, city…" />
          {role !== "All" ? <input type="hidden" name="role" value={role} /> : null}
          <button type="submit">Search <ArrowUpRight size={14} /></button>
        </form>
      </section>

      <section className="fm-directory-controls">
        <div className="fm-directory-count"><strong>{count || 0}</strong><span>PUBLIC PROFILES</span></div>
        <nav className="fm-directory-filters" aria-label="Creator type filters">
          {filters.map((item) => {
            const next = new URLSearchParams();
            if (queryText) next.set("q", queryText);
            if (item !== "All") next.set("role", item);
            return <Link key={item} href={`/creators${next.toString() ? `?${next.toString()}` : ""}`} className={role === item ? "active" : ""}>{item}</Link>;
          })}
        </nav>
      </section>

      <section className="fm-directory-grid">
        {!creators?.length ? (
          <article className="fm-directory-empty"><h2>No public profiles found.</h2><p>Try another name or creator type.</p></article>
        ) : (creators || []).map((creator: any, index: number) => {
          const name = creator.stage_name || creator.nickname || "Creator";
          const image = creator.hero_image_url || creator.avatar_url || "";
          const roles = (creator.creator_types || []).slice(0, 2).join(" · ") || "Creator";
          const copy = creator.epk_tagline || creator.bio || (creator.skills_genres || []).slice(0, 3).join(" · ") || "Public creator on FACKTS Music.";
          const slug = creator.public_slug || creator.id;
          return (
            <Link href={`/creators/${encodeURIComponent(slug)}`} className="fm-directory-card" key={creator.id}>
              <div className="fm-directory-photo">
                {image ? <img src={image} alt={name} /> : <span>{String(name).slice(0, 2).toUpperCase()}</span>}
                <div />
                <small>{String(from + index + 1).padStart(2, "0")}</small>
              </div>
              <div className="fm-directory-copy">
                <span>{roles}</span><h2>{name}</h2><p>{copy}</p>
                <div><small>{creator.location || "FACKTS Music"}</small><b>Open profile ↗</b></div>
              </div>
            </Link>
          );
        })}
      </section>

      {pages > 1 ? (
        <nav className="fm-directory-pagination" aria-label="Creator pages">
          <Link aria-disabled={page <= 1} href={queryFor(Math.max(1, page - 1))}>← Previous</Link>
          <span>Page {page} / {pages}</span>
          <Link aria-disabled={page >= pages} href={queryFor(Math.min(pages, page + 1))}>Next →</Link>
        </nav>
      ) : null}

    </main>
  );
  return sessionUser?<AppShell>{directory}</AppShell>:<><PublicNavigation/>{directory}<PublicFooter/></>;
}
