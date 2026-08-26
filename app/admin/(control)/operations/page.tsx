import Link from "next/link";
import AdminMusicCatalogManager from "../../../../components/AdminMusicCatalogManager";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { resolveArtworkUrl } from "../../../../lib/artwork";

const first = (value: any) => Array.isArray(value) ? value[0] : value;
const label = (value?: string) => (value || "pending").replaceAll("_", " ");
const DEFAULT_PROJECT_COVER = "/images/project-001-default-cover.png";

export default async function AdminOperations() {
  const admin = createAdminClient();
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
  ] = await Promise.all([
    admin.from("beats").select("id,project_id,title,beat_code,producer_name,status,created_at,artwork_url,bpm,musical_key,genre_tags,mood_tags,description,artist_capacity,source_type,external_url,projects(name)").order("created_at", { ascending: false }).limit(50),
    admin.from("tracks").select("id,project_id,beat_id,working_title,track_code,development_status,created_at,projects(name)").order("created_at", { ascending: false }).limit(50),
    admin.from("studio_sessions").select("id,starts_at,location,status,projects(name),tracks(working_title)").order("starts_at", { ascending: false }).limit(8),
    admin.from("project_tasks").select("id,title,status,due_date,projects(name),profiles!project_tasks_assignee_id_fkey(full_name,stage_name)").order("created_at", { ascending: false }).limit(8),
    admin.from("project_members").select("project_id,user_id,profiles(full_name,stage_name)").eq("status", "active"),
    admin.from("beat_contributors").select("id,beat_id,user_id,contribution_role"),
    admin.from("track_contributors").select("id,track_id,user_id,contribution_role"),
    admin.from("beats").select("id,artwork_storage_key"),
    admin.from("tracks").select("id,artwork_url,artwork_storage_key"),
  ]);

  const beats = beatsResult.data ?? [];
  const tracks = tracksResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const beatCredits = beatCreditsResult.data ?? [];
  const trackCredits = trackCreditsResult.data ?? [];
  const beatArtwork = new Map((beatArtworkResult.data ?? []).map((item: any) => [item.id, item.artwork_storage_key]));
  const trackArtworkRows = trackArtworkResult.data ?? [];
  const trackArtwork = new Map(trackArtworkRows.map((item: any) => [item.id, item]));
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
      metadata: {beat_id:track.beat_id}, beatOptions: beats.filter((beat:any)=>beat.project_id===track.project_id).map((beat:any)=>({id:beat.id,label:beat.title||beat.beat_code||"Beat"})),
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
    <AdminMusicCatalogManager records={records} members={members} />
    <section className="control-operation-grid">{sections.map(section => <article className="control-panel" key={section.title}><header><div><span className="control-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2></div><Link href={section.href}>Open workspace</Link></header><div className="control-table">{!section.items.length && <p className="control-empty">No records yet.</p>}{section.items.map(item => <div className="control-row" key={item.id}><span className="control-activity-dot"/><div><strong>{item.name}</strong><small>{item.meta}</small></div><span className="control-status">{label(item.status)}</span></div>)}</div></article>)}</section>
  </>;
}
