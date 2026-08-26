import AppShell from "../../components/AppShell";
import BeatAudioPlayer from "../../components/BeatAudioPlayer";
import TrackIntakeForm from "../../components/TrackIntakeForm";
import TrackUploadForm from "../../components/TrackUploadForm";
import TrackPlaylist from "../../components/TrackPlaylist";
import { createAdminClient } from "../../lib/supabase/admin";
import { createR2PresignedUrl, isR2Configured } from "../../lib/r2";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import { commentOnTrack, deleteTrackNote, saveTrackArScore, updateTrack, updateTrackVotingRound } from "./actions";
import { creatorDisplayName } from "../../lib/profileIdentity";

const trackFileRoles = ["Super Admin", "Project Lead", "A&R", "Producer", "Engineer"];
const trackCreateRoles = ["Super Admin", "Project Lead", "A&R"];

export default async function TracksPage() {
  const { project, membership, roles, user } = await getWorkspace();
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
  const canManageVoting = hasAnyRole(roles, ["Super Admin", "Project Lead", "A&R"]);
  const canScoreAr = hasAnyRole(roles, ["Super Admin", "A&R"]);
  const [tracksResult, beatsResult, membersResult] = await Promise.all([
    admin
      .from("tracks")
      .select("*,beats(title,producer_name,producer_user_id,beat_code),track_contributors(id,user_id,contribution_role,profiles(full_name,stage_name,nickname))")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    canCreate
      ? admin
          .from("beats")
          .select("id,title,beat_code,producer_name,producer_user_id")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("project_members")
      .select("user_id,profiles(full_name,stage_name,nickname)")
      .eq("project_id", project.id)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
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
  const { data: votingRound } = await admin
    .from("track_voting_rounds")
    .select("id,title,status,results_visible,closes_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [commentsResult, assetsResult, rankingsResult, listensResult, arScoresResult] = trackIds.length
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
        votingRound
          ? admin.from("track_rankings").select("track_id,user_id,rank,points").eq("round_id", votingRound.id).in("track_id", trackIds)
          : Promise.resolve({ data: [], error: null }),
        admin.from("track_listens").select("track_id,progress_percent").eq("project_id", project.id).eq("user_id", user.id).in("track_id", trackIds),
        votingRound
          ? admin.from("track_ar_scores").select("track_id,evaluator_id,song_quality,originality,replay_value,performance_potential,release_readiness,note").eq("round_id", votingRound.id).in("track_id", trackIds)
          : Promise.resolve({ data: [], error: null }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

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

  const resultsVisible = Boolean(votingRound?.results_visible || votingRound?.status === "closed");
  const playlist = tracks.map((track: any) => {
    const audio = track.assets.find((asset: any) => asset.mime_type?.startsWith("audio/") && assetAudioUrls[asset.id]);
    const rankings = (rankingsResult.data ?? []).filter((ranking: any) => ranking.track_id === track.id);
    const myRanking = rankings.find((ranking: any) => ranking.user_id === user.id);
    const myListen = (listensResult.data ?? []).find((listen: any) => listen.track_id === track.id);
    const creditedIds = new Set((track.track_contributors || []).map((credit: any) => credit.user_id).filter(Boolean));
    const eligibleVoters = Math.max(0, projectMembers.length - creditedIds.size);
    const communityPoints = rankings.reduce((sum: number, ranking: any) => sum + Number(ranking.points || 0), 0);
    const communityScore = eligibleVoters ? Math.min(100, (communityPoints / (eligibleVoters * 5)) * 100) : 0;
    const arRows = (arScoresResult.data ?? []).filter((score: any) => score.track_id === track.id);
    const arScore = arRows.length
      ? arRows.reduce((sum: number, score: any) => sum + ((Number(score.song_quality) + Number(score.originality) + Number(score.replay_value) + Number(score.performance_potential) + Number(score.release_readiness)) / 5) * 10, 0) / arRows.length
      : 0;
    const finalScore = arRows.length ? communityScore * .7 + arScore * .3 : communityScore;
    const artists = (track.track_contributors || []).filter((credit: any) => ["artist", "featured_artist", "vocalist"].includes(String(credit.contribution_role).toLowerCase())).map((credit: any) => creatorDisplayName(Array.isArray(credit.profiles) ? credit.profiles[0] : credit.profiles));
    return audio ? {
      id: track.id,
      title: track.working_title || "Untitled track",
      subtitle: artists.join(" · ") || "FACKTS Music",
      src: assetAudioUrls[audio.id],
      artwork: artworkUrls[track.id],
      ranking: myRanking?.rank,
      listened: Number(myListen?.progress_percent || 0) >= 60,
      eligible: !creditedIds.has(user.id),
      finalScore,
      communityScore,
      arScore,
      firstPlaceVotes: rankings.filter((ranking: any) => ranking.rank === 1).length,
    } : null;
  }).filter(Boolean).sort((a: any, b: any) => resultsVisible
    ? b.finalScore - a.finalScore || b.firstPlaceVotes - a.firstPlaceVotes || b.arScore - a.arScore || a.title.localeCompare(b.title)
    : a.title.localeCompare(b.title));

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

        <section className="panel track-billboard-section">
          <div className="track-billboard-heading">
            <div>
              <span className="eyebrow">PROJECT LISTENING ROOM</span>
              <h2>{resultsVisible ? "Project Track Chart" : "Top 3 Selection Room"}</h2>
              <p>Listen to at least 60%, then rank your three strongest eligible tracks. #1 earns 5 points, #2 earns 3 and #3 earns 1. Live results stay private to reduce influence.</p>
            </div>
            <span>{votingRound?.status === "closed" ? "ROUND CLOSED" : `${playlist.length} PLAYABLE`}</span>
          </div>
          {canManageVoting && votingRound && (
            <form action={updateTrackVotingRound} className="track-round-controls">
              <input type="hidden" name="round_id" value={votingRound.id} />
              <span>{resultsVisible ? "Results visible" : "Results hidden"}</span>
              {votingRound.status === "open" && <button name="intent" value={resultsVisible ? "hide" : "reveal"}>{resultsVisible ? "Hide results" : "Preview results"}</button>}
              {votingRound.status === "open" && <button className="primary" name="intent" value="close">Close &amp; publish chart</button>}
            </form>
          )}
          <TrackPlaylist tracks={playlist as any} resultsVisible={resultsVisible} />
        </section>

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
            const myArScore = (arScoresResult.data ?? []).find((score: any) => score.track_id === track.id && score.evaluator_id === user.id);
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

                {canScoreAr && votingRound && (
                  <details className="track-ar-score-panel">
                    <summary>A&amp;R evaluation</summary>
                    <form action={saveTrackArScore}>
                      <input type="hidden" name="track_id" value={track.id} />
                      <input type="hidden" name="round_id" value={votingRound.id} />
                      {[
                        ["song_quality", "Song quality"],
                        ["originality", "Originality"],
                        ["replay_value", "Replay value"],
                        ["performance_potential", "Performance potential"],
                        ["release_readiness", "Release readiness"],
                      ].map(([name, label]) => (
                        <label key={name}>{label}<input type="number" name={name} min="1" max="10" required defaultValue={(myArScore as any)?.[name] || 7} /></label>
                      ))}
                      <label className="wide">Private A&amp;R note<textarea name="note" defaultValue={myArScore?.note || ""} placeholder="What should happen next?" /></label>
                      <button>Save evaluation</button>
                    </form>
                  </details>
                )}

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
                    return <div className="track-note-row" key={comment.id}><p><strong>{profile?.stage_name || profile?.full_name || "Contributor"}</strong> {comment.body}</p>{roles.includes("Super Admin") && <form action={deleteTrackNote}><input type="hidden" name="comment_id" value={comment.id} /><button title="Delete this note">Delete</button></form>}</div>;
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
