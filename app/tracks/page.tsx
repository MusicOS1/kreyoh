import AppShell from "../../components/AppShell";
import BeatAudioPlayer from "../../components/BeatAudioPlayer";
import TrackIntakeForm from "../../components/TrackIntakeForm";
import TrackUploadForm from "../../components/TrackUploadForm";
import { createAdminClient } from "../../lib/supabase/admin";
import { createR2PresignedUrl, isR2Configured } from "../../lib/r2";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { commentOnTrack, updateTrack } from "./actions";
import { creatorDisplayName } from "../../lib/profileIdentity";

const trackFileRoles = ["Super Admin", "Project Lead", "A&R", "Producer", "Engineer"];
const trackCreateRoles = ["Super Admin", "Project Lead", "A&R"];

export default async function TracksPage() {
  const { project, membership, roles } = await getWorkspace();
  if (!project || !membership) {
    return (
      <AppShell>
        <div className="content empty-state">
          <h2>Project invitation required</h2>
        </div>
      </AppShell>
    );
  }

  const admin = createAdminClient();
  const canDevelop = hasAnyRole(roles, trackFileRoles);
  const canCreate = hasAnyRole(roles, trackCreateRoles);
  const [tracksResult, beatsResult, membersResult] = await Promise.all([
    admin
      .from("tracks")
      .select("*,beats(title,producer_name,producer_user_id,beat_code),track_contributors(id,contribution_role,profiles(full_name,stage_name,nickname))")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    canCreate
      ? admin
          .from("beats")
          .select("id,title,beat_code,producer_name,producer_user_id")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canCreate
      ? admin
          .from("project_members")
          .select("user_id,profiles(full_name,stage_name,nickname)")
          .eq("project_id", project.id)
          .eq("status", "active")
          .order("joined_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: trackRows, error: tracksError } = tracksResult;

  if (tracksError) {
    console.error("FACKTS MUSIC TRACK LIBRARY ERROR:", tracksError.message);
  }

  const creatorIds = Array.from(new Set((trackRows ?? []).flatMap((track: any) => {
    const beat = Array.isArray(track.beats) ? track.beats[0] : track.beats;
    return [track.created_by, beat?.producer_user_id];
  }).filter(Boolean)));
  const { data: creatorProfiles = [] } = creatorIds.length
    ? await admin.from("profiles").select("id,full_name,stage_name,nickname").in("id", creatorIds)
    : { data: [] as any[] };
  const creators = new Map((creatorProfiles ?? []).map((profile: any) => [profile.id, profile]));

  const trackIds = (trackRows ?? []).map((track: any) => track.id);
  const [commentsResult, assetsResult] = trackIds.length
    ? await Promise.all([
        admin
          .from("comments")
          .select("id,entity_id,body,kind,created_at,profiles!comments_user_id_fkey(full_name,stage_name)")
          .eq("project_id", project.id)
          .eq("entity_type", "track")
          .in("entity_id", trackIds)
          .order("created_at", { ascending: true }),
        admin
          .from("project_assets")
          .select("id,entity_id,bucket_id,storage_path,file_name,mime_type,asset_kind,version_note,created_at,profiles!project_assets_uploaded_by_fkey(full_name,stage_name,nickname)")
          .eq("project_id", project.id)
          .eq("entity_type", "track")
          .in("entity_id", trackIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const tracks = (trackRows ?? []).map((track: any) => ({
    ...track,
    comments: (commentsResult.data ?? []).filter((comment: any) => comment.entity_id === track.id),
    assets: (assetsResult.data ?? []).filter((asset: any) => asset.entity_id === track.id),
  }));

  const usedBeatIds = new Set((trackRows ?? []).map((track: any) => track.beat_id).filter(Boolean));
  const availableBeats = (beatsResult.data ?? []).filter((beat: any) => !usedBeatIds.has(beat.id));
  const projectMembers = (membersResult.data ?? []).map((member: any) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return {
      id: member.user_id,
      name: creatorDisplayName(profile),
    };
  });

  const assetAudioUrls: Record<string, string> = {};
  const artworkUrls: Record<string, string> = {};
  if (isR2Configured()) {
    await Promise.all([
      ...(assetsResult.data ?? []).map(async (asset: any) => {
        if (asset.bucket_id !== "r2" || !asset.storage_path || !asset.mime_type?.startsWith("audio/")) return;
        try {
          assetAudioUrls[asset.id] = await createR2PresignedUrl("GET", asset.storage_path, 3600);
        } catch (cause) {
          console.error(
            `FACKTS MUSIC TRACK AUDIO ERROR (${asset.id}):`,
            cause instanceof Error ? cause.message : cause,
          );
        }
      }),
      ...tracks.map(async (track: any) => {
        if (track.artwork_url) artworkUrls[track.id] = track.artwork_url;
        if (!track.artwork_storage_key) return;
        try {
          artworkUrls[track.id] = await createR2PresignedUrl("GET", track.artwork_storage_key, 3600);
        } catch (cause) {
          console.error(
            `FACKTS MUSIC TRACK ARTWORK ERROR (${track.id}):`,
            cause instanceof Error ? cause.message : cause,
          );
        }
      }),
    ]);
  } else {
    tracks.forEach((track: any) => {
      if (track.artwork_url) artworkUrls[track.id] = track.artwork_url;
    });
  }

  return (
    <AppShell>
      <div className="content fackts-tracks-page">
        <div className="heading">
          <div>
            <span className="eyebrow">PROJECT 001 / DEVELOPMENT</span>
            <h1>Tracks in motion</h1>
            <p>The connected record from original beat to contributors, versions, sessions and release readiness.</p>
          </div>
          <div className="date"><span>{tracks.length} TRACKS</span></div>
        </div>

        {canCreate && (
          <details className="beat-intake-disclosure track-intake-disclosure">
            <summary className="beat-intake-summary">
              <span>TRACK INTAKE</span>
              <strong>Upload a track</strong>
              <small>Choose its source beat, audio and complete project credits.</small>
              <b>Open +</b>
            </summary>
            <TrackIntakeForm beats={availableBeats} members={projectMembers} />
          </details>
        )}

        <div className="operations-list track-operations-list">
          {!tracks.length && (
            <div className="empty-state">
              <h2>No tracks in development</h2>
              <p>Project Lead or A&amp;R can start one from a claimed beat.</p>
            </div>
          )}

          {tracks.map((track: any) => {
            const beat = Array.isArray(track.beats) ? track.beats[0] : track.beats;
            const producerCredit = (track.track_contributors || []).find((credit: any) => ["producer", "co_producer"].includes(String(credit.contribution_role).toLowerCase()));
            const producerName = producerCredit
              ? creatorDisplayName(Array.isArray(producerCredit.profiles) ? producerCredit.profiles[0] : producerCredit.profiles)
              : beat?.producer_user_id
                ? creatorDisplayName(creators.get(beat.producer_user_id))
                : beat?.producer_name || "Uncredited";
            const uploaderName = creatorDisplayName(creators.get(track.created_by));
            return (
              <article className="panel track-development-card" id={`track-${track.id}`} key={track.id}>
                {artworkUrls[track.id] && (
                  <div
                    className="track-catalog-artwork"
                    style={{
                      backgroundImage: `linear-gradient(90deg, rgba(3, 9, 18, .12), rgba(3, 9, 18, .7)), url("${artworkUrls[track.id]}")`,
                    }}
                    aria-label={`${track.working_title || "Track"} cover image`}
                  />
                )}
                <div className="track-card-heading">
                  <div>
                    <span className="eyebrow">{track.track_code || "TRACK"} · {beat?.beat_code || "SOURCE BEAT"}</span>
                    <h2>{track.working_title || beat?.title || "Untitled track"}</h2>
                    <p>Produced by {producerName}</p>
                    <small className="music-uploader-label">Uploaded by {uploaderName}</small>
                  </div>
                  <span className={`status-pill ${track.development_status}`}>
                    {String(track.development_status).replaceAll("_", " ")}
                  </span>
                </div>

                <div className="contributor-row">
                  {(track.track_contributors || []).map((contributor: any) => {
                    const profile = Array.isArray(contributor.profiles) ? contributor.profiles[0] : contributor.profiles;
                    return <span key={contributor.id}>{profile?.stage_name || profile?.full_name} · {contributor.contribution_role}</span>;
                  })}
                </div>

                {canDevelop && (
                  <form action={updateTrack} className="track-stage-form">
                    <input type="hidden" name="track_id" value={track.id} />
                    <select name="status" defaultValue={track.development_status || "in_development"}>
                      <option value="in_development">In Development</option>
                      <option value="revision">Revision</option>
                      <option value="in_studio">In Studio</option>
                      <option value="mixing">Mixing</option>
                      <option value="mastering">Mastering</option>
                      <option value="release_ready">Release Ready</option>
                      <option value="complete">Complete</option>
                    </select>
                    <button>Update stage</button>
                  </form>
                )}

                <section className="track-file-room">
                  <div className="track-file-heading">
                    <div>
                      <span className="eyebrow">FILES &amp; VERSIONS</span>
                      <h3>Creative delivery</h3>
                    </div>
                    <span>{track.assets.length} file{track.assets.length === 1 ? "" : "s"}</span>
                  </div>

                  {!track.assets.length && (
                    <p className="track-file-empty">No demo, mix, master or stems have been attached yet.</p>
                  )}

                  <div className="track-version-list">
                    {track.assets.map((asset: any, index: number) => {
                      const uploader = Array.isArray(asset.profiles) ? asset.profiles[0] : asset.profiles;
                      const version = track.assets.length - index;
                      return (
                        <article className="track-version-card" key={asset.id}>
                          <div className="track-version-meta">
                            <span>{asset.asset_kind.replaceAll("_", " ")}</span>
                            <strong>{asset.file_name}</strong>
                            <small>
                              Version {version} · Uploaded by {creatorDisplayName(uploader)} · {new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(asset.created_at))}
                            </small>
                            {asset.version_note && <p className="track-version-note">{asset.version_note}</p>}
                          </div>
                          {assetAudioUrls[asset.id] ? (
                            <BeatAudioPlayer
                              beatId={asset.id}
                              src={assetAudioUrls[asset.id]}
                              eventName="track_file_played"
                              entityType="asset"
                            />
                          ) : (
                            <span className="track-download-note">
                              {asset.mime_type?.startsWith("audio/") ? "Playback unavailable" : "Stored project file"}
                            </span>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  {canDevelop && <TrackUploadForm trackId={track.id} />}
                </section>

                <div className="track-comments">
                  {(track.comments || []).map((comment: any) => {
                    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
                    return <p key={comment.id}><strong>{profile?.stage_name || profile?.full_name || "Contributor"}</strong> {comment.body}</p>;
                  })}
                </div>

                <form action={commentOnTrack} className="track-comment-form">
                  <input type="hidden" name="track_id" value={track.id} />
                  <input name="comment" required placeholder={roles.includes("A&R") ? "Add A&R note" : "Add a track comment"} />
                  <button>Comment</button>
                </form>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
