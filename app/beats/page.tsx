import AppShell from "../../components/AppShell";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { createAdminClient } from "../../lib/supabase/admin";
import { claimBeat, convertToTrack, leaveIdea, manageClaim, releaseClaim } from "./actions";
import { MusicIcon, PlayIcon, PlusIcon, UsersIcon } from "../../components/Icons";
import BeatUploadForm from "../../components/BeatUploadForm";
import BeatAudioPlayer from "../../components/BeatAudioPlayer";
import { createR2PresignedUrl, isR2Configured } from "../../lib/r2";

const activeStatuses = ["claimed", "confirmed", "converted_to_track"];

export default async function BeatsPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const params = await searchParams;
  const { user, project, membership, roles } = await getWorkspace();
  if (!project || !membership) return <AppShell><div className="content"><div className="empty-state"><h2>Project invitation required</h2><p>Your creator account is ready. A Project Lead must invite you before private Project 001 music becomes visible.</p></div></div></AppShell>;

  const admin = createAdminClient();
  const { data: beatRows } = await admin.from("beats").select(`*, beat_claims(id,artist_id,status,claimed_at,profiles!beat_claims_artist_id_fkey(full_name,stage_name)), comments(id,user_id,kind,body,created_at,profiles!comments_user_id_fkey(full_name,stage_name))`).eq("project_id", project.id).order("created_at", { ascending: false });
  const beats = beatRows ?? [];
  const canUpload = hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R", "Producer"]);
  const canManage = hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R"]);
  const isArtist = roles.includes("Artist");
  const audioUrls: Record<string, string> = {};
  for (const beat of beats) {
    if (beat.storage_provider === "r2" && beat.storage_key && isR2Configured()) {
      audioUrls[beat.id] = beat.playback_url || await createR2PresignedUrl("GET", beat.storage_key, 3600);
    } else if (beat.audio_path) {
      const { data } = await admin.storage.from("beat-audio").createSignedUrl(beat.audio_path, 3600);
      if (data?.signedUrl) audioUrls[beat.id] = data.signedUrl;
    }
  }

  return <AppShell><div className="content fackts-beats-page">
    <div className="heading enter"><div><span className="eyebrow">PROJECT 001 / SOUND</span><h1>Beat Library</h1><p>Listen, claim a development slot and turn the strongest ideas into tracks.</p></div><div className="date"><span>{beats.length} BEATS</span></div></div>
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
        return <article className="beat-card-deck fackts-beat-card" key={beat.id}>
          <div className="beat-card-artwork" style={beat.artwork_url ? { backgroundImage: `url(${beat.artwork_url})` } : undefined}><span className="beat-artwork-index">{beat.beat_code}</span><div className="beat-artwork-wave"><i /><i /><i /><i /><i /><i /></div></div>
          <div className="beat-card-top-row"><div className="beat-card-identity"><span className="beat-code-chip">{beat.source_type || "manual"}</span><h3 className="beat-card-title">{beat.title || "Untitled beat"}</h3><span className="beat-card-producer">by <strong>{beat.producer_name || "Uncredited producer"}</strong></span></div><span className={`status-pill ${String(beat.status).replaceAll(" ", "-")}`}>{full ? "Full" : beat.status}</span></div>
          {source ? <BeatAudioPlayer beatId={beat.id} src={source} /> : <div className="beat-audio-deck"><PlayIcon size={16} /><span>Audio source not attached</span></div>}
          <div className="beat-tags">{beat.bpm && <span>{beat.bpm} BPM</span>}{beat.musical_key && <span>{beat.musical_key}</span>}{(beat.genre_tags || []).map((tag: string) => <span key={tag}>{tag}</span>)}</div>
          {beat.description && <p className="beat-description">{beat.description}</p>}
          <div className="claim-capacity"><UsersIcon size={15} /><strong>{claims.length} / {capacity} Artists</strong><span>{full ? "FULL" : `${capacity - claims.length} slot${capacity - claims.length === 1 ? "" : "s"} left`}</span></div>
          <div className="claim-roster">{claims.map((claim: any) => { const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles; return <span key={claim.id}>{profile?.stage_name || profile?.full_name || "Artist"} · {claim.status}{canManage && <form action={manageClaim}><input type="hidden" name="claim_id" value={claim.id} /><input type="hidden" name="status" value={claim.status === "claimed" ? "confirmed" : "removed"} /><input type="hidden" name="reason" value={claim.status === "claimed" ? "A&R confirmation" : "Project claim change"} /><button>{claim.status === "claimed" ? "Confirm" : "Remove"}</button></form>}</span>})}</div>
          {isArtist && (mine ? <form action={releaseClaim}><input type="hidden" name="beat_id" value={beat.id} /><button className="interest-button-glow active">Release my claim</button></form> : <form action={claimBeat}><input type="hidden" name="beat_id" value={beat.id} /><button className="interest-button-glow" disabled={full}>{full ? "FULL / SLOTS FILLED" : <><PlusIcon size={14} /> CLAIM A SLOT</>}</button><small className="claim-legal-note">A claim is a participation slot, not ownership of the beat, master or publishing.</small></form>)}
          <details className="idea-box"><summary>Leave an idea</summary><form action={leaveIdea}><input type="hidden" name="beat_id" value={beat.id} /><textarea name="idea" required placeholder="What do you hear on this beat?" /><button>Share idea</button></form>{(beat.comments || []).filter((c: any) => c.kind === "idea").map((c: any) => { const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles; return <p key={c.id}><strong>{profile?.stage_name || profile?.full_name || "Contributor"}</strong> {c.body}</p>})}</details>
          {canManage && <form action={convertToTrack} className="convert-track-form"><input type="hidden" name="beat_id" value={beat.id} /><input name="title" placeholder="Track working title" defaultValue={beat.title || ""} /><button>Start track development</button></form>}
        </article>;
      })}
    </section>
  </div></AppShell>;
}
