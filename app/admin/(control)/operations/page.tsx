import Link from "next/link";
import AdminMusicCatalogManager from "../../../../components/AdminMusicCatalogManager";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { resolveArtworkUrl } from "../../../../lib/artwork";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
const label = (value?: string) => (value || "pending").replaceAll("_", " ");
const DEFAULT_PROJECT_COVER = "/images/project-001-default-cover.png";
const PAGE_SIZE = 15;

export default async function AdminOperations({ searchParams }: { searchParams: Promise<{ beatPage?: string; trackPage?: string; q?: string }> }) {
  const params = await searchParams;
  const beatPage = Math.max(1, Number(params.beatPage) || 1);
  const trackPage = Math.max(1, Number(params.trackPage) || 1);
  const search = (params.q || "").trim();
  const admin = createAdminClient();

  let adminBeatsQuery = admin
    .from("beats")
    .select("*,projects(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((beatPage - 1) * PAGE_SIZE, beatPage * PAGE_SIZE - 1);

  let adminTracksQuery = admin
    .from("tracks")
    .select("*,projects(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((trackPage - 1) * PAGE_SIZE, trackPage * PAGE_SIZE - 1);

  if (search) {
    const safeSearch = search.replaceAll(",", " ");
    adminBeatsQuery = adminBeatsQuery.or(`title.ilike.%${safeSearch}%,beat_code.ilike.%${safeSearch}%,producer_name.ilike.%${safeSearch}%`);
    adminTracksQuery = adminTracksQuery.or(`working_title.ilike.%${safeSearch}%,track_code.ilike.%${safeSearch}%`);
  }
  const [
    beatsResult,
    tracksResult,
    sessionsResult,
    tasksResult,
    membersResult,
    beatCreditsResult,
    trackCreditsResult,
    beatArtworkResult,
    trackArtworkResult,
    beatOptionsResult,
  ] = await Promise.all([
    adminBeatsQuery,
    adminTracksQuery,
    admin.from("studio_sessions").select("id,starts_at,location,status,projects(name),tracks(working_title)").order("starts_at", { ascending: false }).limit(8),
    admin.from("project_tasks").select("id,title,status,due_date,projects(name),profiles!project_tasks_assignee_id_fkey(full_name,stage_name)").order("created_at", { ascending: false }).limit(8),
    admin.from("project_members").select("project_id,user_id,profiles(full_name,stage_name)").eq("status", "active"),
    admin.from("beat_contributors").select("id,beat_id,user_id,contribution_role"),
    admin.from("track_contributors").select("id,track_id,user_id,contribution_role"),
    admin.from("beats").select("id,artwork_storage_key"),
    admin.from("tracks").select("id,artwork_url,artwork_storage_key"),
    admin.from("beats").select("id,project_id,title,beat_code").order("created_at", { ascending: false }),
  ]);

  const beats = beatsResult.data ?? [];
  const tracks = tracksResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const beatCredits = beatCreditsResult.data ?? [];
  const trackCredits = trackCreditsResult.data ?? [];
  const beatArtwork = new Map((beatArtworkResult.data ?? []).map((item: any) => [item.id, item.artwork_storage_key]));
  const trackArtworkRows = (trackArtworkResult.data ?? []) as Array<{
    id: string;
    artwork_url: string | null;
    artwork_storage_key: string | null;
  }>;
  const beatOptions = beatOptionsResult.data ?? [];
  const trackArtwork = new Map<string, { artwork_url: string | null; artwork_storage_key: string | null }>(
    trackArtworkRows.map((item) => [item.id, { artwork_url: item.artwork_url, artwork_storage_key: item.artwork_storage_key }]),
  );
  const signedArtwork = new Map<string, string>();

  await Promise.all([
      ...beats.map(async (beat: any) => {
        const key = beatArtwork.get(beat.id);
        try { const url = await resolveArtworkUrl(key ? String(key) : null, beat.artwork_url); if (url) signedArtwork.set(`beat:${beat.id}`, url); } catch { /* use placeholder */ }
      }),
      ...tracks.map(async (track: any) => {
        const key = trackArtwork.get(track.id)?.artwork_storage_key;
        try { const url = await resolveArtworkUrl(key, trackArtwork.get(track.id)?.artwork_url); if (url) signedArtwork.set(`track:${track.id}`, url); } catch { /* render placeholder */ }
      }),
  ]);

  const members = (membersResult.data ?? []).map((membership: any) => {
    const profile = first(membership.profiles);
    return { id: membership.user_id, projectId: membership.project_id, name: profile?.stage_name || profile?.full_name || "Project member" };
  });

  const records = [
    ...beats.map((beat: any) => ({
      id: beat.id, type: "beat" as const, projectId: beat.project_id,
      projectName: first(beat.projects)?.name || "No project", title: beat.title || "Untitled beat",
      code: beat.beat_code || "BEAT", status: beat.status || "available",
      artworkUrl: signedArtwork.get(`beat:${beat.id}`) || beat.artwork_url || DEFAULT_PROJECT_COVER,
      metadata: {producer_name:beat.producer_name,bpm:beat.bpm,musical_key:beat.musical_key,genre_tags:beat.genre_tags,mood_tags:beat.mood_tags,description:beat.description,artist_capacity:beat.artist_capacity,source_type:beat.source_type,external_url:beat.external_url},
      credits: beatCredits.filter((credit: any) => credit.beat_id === beat.id).map((credit: any) => ({ id: credit.id, userId: credit.user_id, role: credit.contribution_role })),
    })),
    ...tracks.map((track: any) => ({
      id: track.id, type: "track" as const, projectId: track.project_id,
      projectName: first(track.projects)?.name || "No project", title: track.working_title || "Untitled track",
      code: track.track_code || "TRACK", status: track.development_status || "in_development",
      artworkUrl: signedArtwork.get(`track:${track.id}`) || trackArtwork.get(track.id)?.artwork_url || DEFAULT_PROJECT_COVER,
      metadata: {beat_id:track.beat_id}, beatOptions: beatOptions.filter((beat:any)=>beat.project_id===track.project_id).map((beat:any)=>({id:beat.id,label:beat.title||beat.beat_code||"Beat"})),
      credits: trackCredits.filter((credit: any) => credit.track_id === track.id).map((credit: any) => ({ id: credit.id, userId: credit.user_id, role: credit.contribution_role })),
    })),
  ];

  const sections = [
    { title: "Beat library", eyebrow: "MUSIC INTAKE", href: "/beats", items: beats.slice(0, 8).map((item: any) => ({ id: item.id, name: item.title || item.beat_code || "Untitled beat", meta: `${item.producer_name || "Producer pending"} / ${first(item.projects)?.name || "No project"}`, status: item.status })) },
    { title: "Tracks in development", eyebrow: "CATALOGUE", href: "/tracks", items: tracks.slice(0, 8).map((item: any) => ({ id: item.id, name: item.working_title || item.track_code || "Untitled track", meta: first(item.projects)?.name || "No project", status: item.development_status })) },
    { title: "Studio sessions", eyebrow: "ROOMS", href: "/studio-sessions", items: sessions.map((item: any) => ({ id: item.id, name: first(item.tracks)?.working_title || "Project session", meta: `${new Date(item.starts_at).toLocaleString("en-KE")} / ${item.location || "Location pending"}`, status: item.status })) },
    { title: "Actions and delivery", eyebrow: "WORK", href: "/tasks", items: tasks.map((item: any) => ({ id: item.id, name: item.title, meta: `${first(item.profiles)?.stage_name || first(item.profiles)?.full_name || "Unassigned"}${item.due_date ? ` / due ${item.due_date}` : ""}`, status: item.status })) },
  ];

  return <>
    <section className="control-page-hero operations"><span className="control-eyebrow">MUSIC OPERATIONS</span><h1>Manage the catalogue.</h1><p>Control official credits, cover images and the records moving through FACKTS Music. These destructive controls are visible only inside the private Control Room.</p></section>
    <AdminMusicCatalogManager records={records} members={members} beatTotal={beatsResult.count || 0} trackTotal={tracksResult.count || 0} beatPage={beatPage} trackPage={trackPage} pageSize={PAGE_SIZE} query={search} />
    <section className="control-operation-grid">{sections.map(section => <article className="control-panel" key={section.title}><header><div><span className="control-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2></div><Link href={section.href}>Open workspace</Link></header><div className="control-table">{!section.items.length && <p className="control-empty">No records yet.</p>}{section.items.map((item: { id: string; name: string; meta: string; status?: string }) => <div className="control-row" key={item.id}><span className="control-activity-dot"/><div><strong>{item.name}</strong><small>{item.meta}</small></div><span className="control-status">{label(item.status)}</span></div>)}</div></article>)}</section>
  </>;
}
