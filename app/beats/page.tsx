import AppShell from "../../components/AppShell";
import Link from "next/link";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { createAdminClient } from "../../lib/supabase/admin";
import { claimBeat, convertToTrack, leaveIdea, manageClaim, releaseClaim, updateOwnBeatMetadata } from "./actions";
import { MusicIcon, PlayIcon, PlusIcon, UsersIcon } from "../../components/Icons";
import BeatUploadForm from "../../components/BeatUploadForm";
import BeatAudioPlayer from "../../components/BeatAudioPlayer";
import { createR2PresignedUrl, isR2Configured } from "../../lib/r2";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { resolveArtworkUrl } from "../../lib/artwork";

const activeStatuses = ["claimed", "confirmed", "converted_to_track"];
const DEFAULT_PROJECT_COVER = "/images/project-001-default-cover.png";
const PAGE_SIZE = 15;

export default async function BeatsPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const { user, project, membership, roles } = await getWorkspace();
  if (!project || !membership) return <AppShell><div className="content"><div className="empty-state"><h2>Project invitation required</h2><p>Your creator account is ready. A Project Lead must invite you before private Project 001 music becomes visible.</p></div></div></AppShell>;

  const admin = createAdminClient();
  const page = Math.max(1, Number(params.page) || 1);
  const search = String(params.q || "").trim().replace(/[,%()]/g, " ");
  let beatQuery = admin
    .from("beats")
    .select("*", { count: "exact" })
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) beatQuery = beatQuery.or(`title.ilike.%${search}%,beat_code.ilike.%${search}%,producer_name.ilike.%${search}%`);
  const { data: beatRows, error: beatsError, count: beatCount = 0 } = await beatQuery;

  if (beatsError) {
    console.error("FACKTS MUSIC BEAT LIBRARY ERROR:", beatsError.message);
  }

  const beatIds = (beatRows ?? []).map((beat: any) => beat.id);
  const [claimsResult, commentsResult, creditsResult] = beatIds.length
    ? await Promise.all([
        admin
          .from("beat_claims")
          .select("id,beat_id,artist_id,status,claimed_at,profiles!beat_claims_artist_id_fkey(full_name,stage_name,nickname)")
          .in("beat_id", beatIds),
        admin
          .from("comments")
          .select("id,entity_id,user_id,kind,body,created_at,profiles!comments_user_id_fkey(full_name,stage_name,nickname)")
          .eq("project_id", project.id)
          .eq("entity_type", "beat")
          .in("entity_id", beatIds),
        admin
          .from("beat_contributors")
          .select("id,beat_id,user_id,contribution_role,profiles(full_name,stage_name,nickname)")
          .in("beat_id", beatIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const beats = (beatRows ?? []).map((beat: any) => ({
    ...beat,
    beat_claims: (claimsResult.data ?? []).filter((claim: any) => claim.beat_id === beat.id),
    comments: (commentsResult.data ?? []).filter((comment: any) => comment.entity_id === beat.id),
    contributors: (creditsResult.data ?? []).filter((credit: any) => credit.beat_id === beat.id),
  }));
  const uploaderIds = Array.from(new Set((beatRows ?? []).flatMap((beat: any) => [beat.created_by, beat.producer_user_id]).filter(Boolean)));
  const { data: uploaderProfiles = [] } = uploaderIds.length
    ? await admin.from("profiles").select("id,full_name,stage_name,nickname").in("id", uploaderIds)
    : { data: [] as any[] };
  const uploaders = new Map((uploaderProfiles ?? []).map((profile: any) => [profile.id, profile]));
  const canUpload = hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R", "Producer"]);
  const canManage = hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R"]);
  const isArtist = roles.includes("Artist");
  const audioUrls: Record<string, string> = {};
  const artworkUrls: Record<string, string> = {};
  await Promise.all(beats.map(async (beat: any) => {
    try {
      if (beat.storage_provider === "r2" && beat.storage_key && isR2Configured()) {
        audioUrls[beat.id] = beat.playback_url || await createR2PresignedUrl("GET", beat.storage_key, 3600);
      } else if (beat.audio_path) {
        const { data } = await admin.storage.from("beat-audio").createSignedUrl(beat.audio_path, 3600);
        if (data?.signedUrl) audioUrls[beat.id] = data.signedUrl;
      }

      const artwork = await resolveArtworkUrl(beat.artwork_storage_key, beat.artwork_url);
      artworkUrls[beat.id] = artwork || DEFAULT_PROJECT_COVER;
    } catch (cause) {
      artworkUrls[beat.id] = DEFAULT_PROJECT_COVER;
      console.error(
        `FACKTS MUSIC AUDIO URL ERROR (${beat.id}):`,
        cause instanceof Error ? cause.message : cause,
      );
    }
  }));

  return <AppShell><div className="content fackts-beats-page">
    <div className="heading enter"><div><span className="eyebrow">{project.code} / SOUND</span><h1>Beat Library</h1><p>Listen, claim a development slot and turn the strongest ideas into tracks.</p></div><div className="date"><span>{beatCount || 0} BEATS</span></div></div>
    {params.message && <div className="form-success-alert">{params.message}</div>}{params.error && <div className="form-error-alert">{params.error}</div>}

{canUpload && <details className="beat-intake-disclosure"><summary className="beat-intake-summary"><span>PRODUCER INTAKE</span><strong>Upload a beat</strong><small>Direct audio or an external source.</small><b>Open +</b></summary><BeatUploadForm defaultCapacity={project.default_beat_capacity || 3} /></details>}

    <section className="beats-grid-cards">
      {!beats.length && <article className="panel empty-state"><MusicIcon size={28} /><h2>No beats available yet</h2><p>{canUpload ? "Upload the first Project 001 beat when the sound is ready." : "Producers and the project team will publish beats here."}</p></article>}
      {beats.map((beat: any) => {
        const claims = (beat.beat_claims || []).filter((claim: any) => activeStatuses.includes(claim.status));
        const capacity = beat.artist_capacity || project.default_beat_capacity || 3;
        const full = claims.length >= capacity;
        const mine = claims.find((claim: any) => claim.artist_id === user.id);
        const source = audioUrls[beat.id] || beat.external_url;
        const canEditMetadata = canManage || (roles.includes("Producer") && (beat.created_by === user.id || beat.producer_user_id === user.id));
        const producerCredit = (beat.contributors || []).find((credit: any) => ["producer", "co_producer"].includes(String(credit.contribution_role).toLowerCase()));
        const producerProfile = producerCredit ? (Array.isArray(producerCredit.profiles) ? producerCredit.profiles[0] : producerCredit.profiles) : null;
        const producerName = producerProfile
          ? creatorDisplayName(producerProfile)
          : beat.producer_user_id
            ? creatorDisplayName(uploaders.get(beat.producer_user_id))
            : beat.producer_name || "Uncredited producer";
        const uploaderName = creatorDisplayName(uploaders.get(beat.created_by));
        return <article className="beat-card-deck fackts-beat-card" id={`beat-${beat.id}`} key={beat.id}>
          <div
            className={`beat-card-artwork${artworkUrls[beat.id] ? " has-artwork" : ""}`}
            style={artworkUrls[beat.id] ? {
              backgroundImage: `linear-gradient(180deg, rgba(3, 9, 18, .04), rgba(3, 9, 18, .58)), url("${artworkUrls[beat.id]}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            } : undefined}
          ><span className="beat-artwork-index">{beat.beat_code}</span><div className="beat-artwork-wave"><i /><i /><i /><i /><i /><i /></div></div>
          <div className="beat-card-top-row"><div className="beat-card-identity"><span className="beat-code-chip">{beat.source_type || "manual"}</span><h3 className="beat-card-title">{beat.title || "Untitled beat"}</h3><span className="beat-card-producer">Produced by <strong>{producerName}</strong></span><small className="music-uploader-label">Uploaded by {uploaderName}</small></div><span className={`status-pill ${String(beat.status).replaceAll(" ", "-")}`}>{full ? "Full" : beat.status}</span></div>
          {!!beat.contributors?.length && <div className="contributor-row">{beat.contributors.map((credit: any) => { const profile = Array.isArray(credit.profiles) ? credit.profiles[0] : credit.profiles; return <span key={credit.id}>{profile?.stage_name || profile?.full_name || "Contributor"} · {String(credit.contribution_role).replaceAll("_", " ")}</span>; })}</div>}
          {source ? <BeatAudioPlayer beatId={beat.id} src={source} /> : <div className="beat-audio-deck"><PlayIcon size={16} /><span>Audio source not attached</span></div>}
          <div className="beat-tags">{beat.bpm && <span>{beat.bpm} BPM</span>}{beat.musical_key && <span>{beat.musical_key}</span>}{(beat.genre_tags || []).map((tag: string) => <span key={tag}>{tag}</span>)}</div>
          {beat.description && <p className="beat-description">{beat.description}</p>}
          {canEditMetadata && <details className="beat-metadata-editor"><summary>Edit beat details +</summary><form action={updateOwnBeatMetadata}><input type="hidden" name="beat_id" value={beat.id}/><input name="title" defaultValue={beat.title||""} placeholder="Beat title"/><input name="producer_name" defaultValue={beat.producer_name||""} placeholder="Producer credit"/><input name="bpm" type="number" min="20" max="400" defaultValue={beat.bpm||""} placeholder="BPM"/><input name="musical_key" defaultValue={beat.musical_key||""} placeholder="Key"/><input name="genre_tags" defaultValue={(beat.genre_tags||[]).join(", ")} placeholder="Genres"/><input name="mood_tags" defaultValue={(beat.mood_tags||[]).join(", ")} placeholder="Moods"/><input name="artist_capacity" type="number" min="1" max="12" defaultValue={beat.artist_capacity||project.default_beat_capacity||3}/><textarea name="description" defaultValue={beat.description||""} placeholder="Description"/><button>Save beat details</button></form></details>}
          <div className="claim-capacity"><UsersIcon size={15} /><strong>{claims.length} / {capacity} Artists</strong><span>{full ? "FULL" : `${capacity - claims.length} slot${capacity - claims.length === 1 ? "" : "s"} left`}</span></div>
          <div className="claim-roster">{claims.map((claim: any) => { const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles; return <span key={claim.id}>{profile?.stage_name || profile?.full_name || "Artist"} · {claim.status}{canManage && <form action={manageClaim}><input type="hidden" name="claim_id" value={claim.id} /><input type="hidden" name="status" value={claim.status === "claimed" ? "confirmed" : "removed"} /><input type="hidden" name="reason" value={claim.status === "claimed" ? "A&R confirmation" : "Project claim change"} /><button>{claim.status === "claimed" ? "Confirm" : "Remove"}</button></form>}</span>})}</div>
          {isArtist && (mine ? <form action={releaseClaim}><input type="hidden" name="beat_id" value={beat.id} /><button className="interest-button-glow active">Release my claim</button></form> : <form action={claimBeat}><input type="hidden" name="beat_id" value={beat.id} /><button className="interest-button-glow" disabled={full}>{full ? "FULL / SLOTS FILLED" : <><PlusIcon size={14} /> CLAIM A SLOT</>}</button><small className="claim-legal-note">A claim is a participation slot, not ownership of the beat, master or publishing.</small></form>)}
          <details className="idea-box"><summary>Leave an idea</summary><form action={leaveIdea}><input type="hidden" name="beat_id" value={beat.id} /><textarea name="idea" required placeholder="What do you hear on this beat?" /><button>Share idea</button></form>{(beat.comments || []).filter((c: any) => c.kind === "idea").map((c: any) => { const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles; return <p key={c.id}><strong>{profile?.stage_name || profile?.full_name || "Contributor"}</strong> {c.body}</p>})}</details>
          {canManage && <form action={convertToTrack} className="convert-track-form"><input type="hidden" name="beat_id" value={beat.id} /><input name="title" placeholder="Track working title" defaultValue={beat.title || ""} /><button>Start track development</button></form>}
        </article>;
      })}
    </section>
    {(beatCount || 0) > PAGE_SIZE && <nav className="pagination" aria-label="Beat pages"><Link aria-disabled={page<=1} href={`/beats?q=${encodeURIComponent(search)}&page=${Math.max(1,page-1)}`}>Previous</Link><span>Page {page} of {Math.ceil((beatCount || 0)/PAGE_SIZE)}</span><Link aria-disabled={page>=Math.ceil((beatCount || 0)/PAGE_SIZE)} href={`/beats?q=${encodeURIComponent(search)}&page=${Math.min(Math.ceil((beatCount || 0)/PAGE_SIZE),page+1)}`}>Next</Link></nav>}
  </div></AppShell>;
}
