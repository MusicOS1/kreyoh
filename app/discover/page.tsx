import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";

const PAGE_SIZE = 15;
const filters = ["All","Artist","Producer","Engineer","A&R","Manager","Other Creative"];

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const params = await searchParams;
  const { admin } = await getWorkspace();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const queryText = String(params.q || "").trim().replace(/[,%()]/g, " ");
  const role = filters.includes(String(params.role)) ? String(params.role) : "All";

  let query = admin.from("profiles")
    .select("id,stage_name,avatar_url,hero_image_url,bio,location,skills_genres,creator_types,public_slug", { count: "exact" })
    .eq("profile_visibility", "public")
    .order("stage_name", { ascending: true, nullsFirst: false })
    .range(from, to);
  if (queryText) query = query.or(`stage_name.ilike.%${queryText}%,bio.ilike.%${queryText}%,location.ilike.%${queryText}%`);
  if (role !== "All") query = query.contains("creator_types", [role]);
  const { data: creators = [], count = 0 } = await query;
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const queryFor = (targetPage: number) => { const next = new URLSearchParams(); if (queryText) next.set("q", queryText); if (role !== "All") next.set("role", role); next.set("page", String(targetPage)); return `/discover?${next.toString()}`; };

  return <AppShell><div className="content discover-page">
    <section className="discover-hero"><span className="eyebrow">DISCOVER FACKTS MUSIC</span><h1>Find the people who move music.</h1><p>Public creator profiles from across the FACKTS Music ecosystem—artists, producers, engineers, A&R, managers and the wider creative room.</p><form className="discover-search"><input name="q" defaultValue={queryText} placeholder="Search artists, producers, engineers…"/><input type="hidden" name="role" value={role === "All" ? "" : role}/><button>Search</button></form></section>
    <nav className="discover-filters" aria-label="Creator roles">{filters.map(item => { const next = new URLSearchParams(); if (queryText) next.set("q", queryText); if (item !== "All") next.set("role", item); return <Link key={item} href={`/discover?${next.toString()}`} className={role === item ? "active" : ""}>{item}</Link>; })}</nav>
    <div className="platform-section-heading"><div><span className="eyebrow">PUBLIC DIRECTORY</span><h2>{count || 0} creator{count === 1 ? "" : "s"}</h2></div><span>Showing {count ? from + 1 : 0}–{Math.min(from + PAGE_SIZE, count || 0)} of {count || 0}</span></div>
    <section className="creator-directory-grid">{!creators?.length && <article className="panel empty-state"><h2>No public profiles found</h2><p>Try a different search or creator role.</p></article>}{(creators || []).map((creator: any) => { const name = creator.stage_name || "FACKTS Music Creator"; return <Link href={`/creators/${creator.public_slug || creator.id}`} className="creator-directory-card" key={creator.id}>
      <div className="creator-directory-image" style={creator.hero_image_url ? { backgroundImage: `linear-gradient(180deg,transparent,rgba(3,8,15,.92)),url(${creator.hero_image_url})` } : undefined}>{creator.avatar_url ? <img src={creator.avatar_url} alt=""/> : <span>{name.slice(0,2).toUpperCase()}</span>}</div>
      <div><span className="eyebrow">{(creator.creator_types || []).join(" · ") || "CREATOR"}</span><h3>{name}</h3><p>{creator.bio || "Independent creator on FACKTS Music."}</p><small>{[creator.location, ...(creator.skills_genres || []).slice(0,2)].filter(Boolean).join(" · ")}</small></div>
    </Link>; })}</section>
    {pages > 1 && <nav className="pagination" aria-label="Creator pages"><Link aria-disabled={page <= 1} href={queryFor(Math.max(1,page-1))}>Previous</Link>{Array.from({length: pages},(_,index)=>index+1).slice(Math.max(0,page-3),Math.min(pages,page+2)).map(value=><Link className={value===page?"active":""} key={value} href={queryFor(value)}>{value}</Link>)}<Link aria-disabled={page >= pages} href={queryFor(Math.min(pages,page+1))}>Next</Link></nav>}
  </div></AppShell>;
}
