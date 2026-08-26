import React from "react";
import Link from "next/link";

import AppShell from "../../components/AppShell";
import AmbientMusicAtmosphere from "../../components/AmbientMusicAtmosphere";
import BeatAudioPlayer from "../../components/BeatAudioPlayer";

import { getWorkspace } from "../../lib/workspace";
import { createAdminClient } from "../../lib/supabase/admin";
import { createR2PresignedUrl, isR2Configured } from "../../lib/r2";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { calculateProjectProgress } from "../../lib/projectProgress";

import {
  ActivityIcon,
  ArrowUpRight,
  CheckCircleIcon,
  ClockIcon,
  MusicIcon,
  PlayIcon,
} from "../../components/Icons";

function first(value: any) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function statusClass(
  status: string | null | undefined
) {
  return String(status || "available")
    .toLowerCase()
    .replaceAll(" ", "-");
}

function readableAction(
  action: string | null | undefined
) {
  return String(
    action || "Project activity"
  )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "K"
  );
}

const JOURNEY = [
  {
    label: "Started",
    note: "The project takes shape",
    threshold: 0,
  },
  {
    label: "Beats",
    note: "The sound finds its palette",
    threshold: 12,
  },
  {
    label: "Writing",
    note: "Ideas become songs",
    threshold: 28,
  },
  {
    label: "Sessions",
    note: "The room comes alive",
    threshold: 45,
  },
  {
    label: "Production",
    note: "Details become direction",
    threshold: 62,
  },
  {
    label: "Rights",
    note: "The record is protected",
    threshold: 80,
  },
  {
    label: "Release",
    note: "The work meets the world",
    threshold: 94,
  },
];

export default async function WorkspacePage() {
  const {
    user,
    project,
    roles,
    membership,
  } = await getWorkspace();

  if (!project || !membership) {
    return (
      <AppShell>
        <div className="content">
          <section className="member-home-hero">
            <span className="eyebrow">YOU ARE IN</span>
            <h1>Welcome to FACKTS Music</h1>
            <p>Your creative workspace starts with a project. Join an existing project, accept an invitation, or start one of your own.</p>
            <div className="member-home-actions"><Link href="/projects" className="login-submit-btn">Explore Projects</Link><Link href="/projects#create" className="creative-secondary-action">Create Project</Link><Link href="/invitations" className="creative-secondary-action">View Invitations</Link></div>
          </section>
          <section className="member-home-capabilities">
            {[['Discover & claim beats','Find the right sound and reserve a development slot.'],['Collaborate in one room','Work with artists, producers, A&R and engineers.'],['Develop tracks','Keep music, feedback and next stages connected.'],['Join studio sessions','Know where to be and what the room needs.'],['Receive actions','See the work assigned to you and keep it moving.'],['Record your contribution','Build an approved creative history and credits.']].map(([title,copy])=><article className="panel" key={title}><span className="eyebrow">FACKTS MUSIC</span><h2>{title}</h2><p>{copy}</p></article>)}
          </section>
        </div>
      </AppShell>
    );
  }

  /*
   * Project-wide dashboard reads.
   *
   * This is server-only and gives us accurate
   * project numbers regardless of individual
   * RLS visibility.
   */
  const admin = createAdminClient();

  const isAdmin =
    roles.includes("Admin") || roles.includes("Super Admin");

  const isProjectLead =
    roles.includes("Project Lead");

  const isArtist =
    roles.includes("Artist");

  const isProducer =
    roles.includes("Producer");

  const isEngineer =
    roles.includes("Engineer");

  const isAR =
    roles.includes("A&R") ||
    roles.includes("AR");

  const isFinance =
    roles.includes("Finance");

  const [
    membersResult,
    beatsResult,
    tracksResult,
    sessionsResult,
    myAssignmentsResult,
    myInterestResult,
    activityResult,
    pipelineResult,
    featuredTracksResult,
    featuredTrackAssetsResult,
    beatArtworkKeysResult,
    trackArtworkKeysResult,
    peoplePreviewResult,
  ] = await Promise.all([
    /*
     * PEOPLE
     */
    admin
      .from("project_members")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "project_id",
        project.id
      )
      .eq(
        "status",
        "active"
      ),

    /*
     * BEATS
     */
    admin
      .from("beats")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "project_id",
        project.id
      ),

    /*
     * TRACKS
     */
    admin
      .from("tracks")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "project_id",
        project.id
      ),

    /*
     * SESSIONS
     *
     * If this table is not yet created,
     * the dashboard safely shows zero.
     */
    admin
      .from("studio_sessions")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "project_id",
        project.id
      ),

    /*
     * MY ASSIGNMENTS
     */
    admin
      .from("beat_assignments")
      .select(`
        id,
        beat_id,

        beats (
          id,
          beat_code,
          title,
          status,
          writing_deadline,
          external_url,
          producer_name
        )
      `)
      .eq(
        "user_id",
        user.id
      )
      .limit(6),

    /*
     * MY INTEREST
     */
    admin
      .from("beat_interest")
      .select(`
        id,
        beat_id,

        beats (
          id,
          beat_code,
          title,
          status,
          producer_name,
          external_url
        )
      `)
      .eq(
        "user_id",
        user.id
      )
      .limit(6),

    /*
     * ACTIVITY
     */
    admin
      .from("activity_log")
      .select(
        "id, action, created_at, entity_type"
      )
      .eq(
        "project_id",
        project.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(6),

    /*
     * FEATURED BEATS
     */
    admin
      .from("beats")
      .select(`
        id,
        beat_code,
        title,
        producer_name,
        producer_user_id,
        status,
        writing_deadline,
        external_url,
        source_provider,
        source_type,
        storage_provider,
        storage_key,
        playback_url,
        audio_path,
        artwork_url,

        beat_contributors (
          id,
          contribution_role,
          profiles (
            full_name,
            stage_name,
            nickname
          )
        ),

        beat_interest (
          id
        ),

        beat_assignments (
          id
        )
      `)
      .eq(
        "project_id",
        project.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(5),

    /*
     * FEATURED TRACKS
     */
    admin
      .from("tracks")
      .select(`
        id,
        track_code,
        working_title,
        status,
        development_status,
        created_at,

        beats (
          id,
          beat_code,
          title,
          producer_name,
          producer_user_id
        ),

        track_contributors (
          id,
          contribution_role,
          profiles (
            full_name,
            stage_name,
            nickname
          )
        )
      `)
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(4),

    /*
     * RECENT TRACK AUDIO / VERSIONS
     */
    admin
      .from("project_assets")
      .select("id,entity_id,bucket_id,storage_path,file_name,mime_type,asset_kind,created_at")
      .eq("project_id", project.id)
      .eq("entity_type", "track")
      .order("created_at", { ascending: false })
      .limit(24),

    /* Optional private artwork fields added by the catalogue migration. */
    admin
      .from("beats")
      .select("id,artwork_storage_key")
      .eq("project_id", project.id),

    admin
      .from("tracks")
      .select("id,artwork_url,artwork_storage_key")
      .eq("project_id", project.id),

    /*
     * PEOPLE PREVIEW
     */
    admin
      .from("project_members")
      .select(`
        id,
        status,
        joined_at,

        profiles (
          id,
          full_name,
          stage_name,
          nickname,
          email,
          avatar_url
        ),

        member_roles (
          roles (
            name
          )
        )
      `)
      .eq(
        "project_id",
        project.id
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "joined_at",
        {
          ascending: true,
        }
      )
      .limit(6),
  ]);

  const membersCount =
    membersResult.count ?? 0;

  const beatsCount =
    beatsResult.count ?? 0;

  const tracksCount =
    tracksResult.count ?? 0;

  const sessionsCount =
    sessionsResult.error
      ? 0
      : sessionsResult.count ?? 0;

  const myAssignments =
    myAssignmentsResult.data ?? [];

  const myInterests =
    myInterestResult.data ?? [];

  const activity =
    activityResult.data ?? [];

  const pipeline =
    pipelineResult.data ?? [];

  const featuredBeatAudio: Record<string, string> = {};

  await Promise.all(
    pipeline.map(async (beat: any) => {
      try {
        if (
          beat.storage_provider === "r2" &&
          beat.storage_key &&
          isR2Configured()
        ) {
          featuredBeatAudio[beat.id] =
            beat.playback_url ||
            (await createR2PresignedUrl(
              "GET",
              beat.storage_key,
              3600
            ));
        } else if (beat.audio_path) {
          const { data } = await admin.storage
            .from("beat-audio")
            .createSignedUrl(
              beat.audio_path,
              3600
            );

          if (data?.signedUrl) {
            featuredBeatAudio[beat.id] =
              data.signedUrl;
          }
        }
      } catch (cause) {
        console.error(
          `FACKTS MUSIC FEATURED AUDIO ERROR (${beat.id}):`,
          cause instanceof Error
            ? cause.message
            : cause
        );
      }
    })
  );

  const beatArtworkKeys = new Map(
    (beatArtworkKeysResult.data ?? []).map((item: any) => [
      item.id,
      item.artwork_storage_key,
    ])
  );
  const trackArtworkRows = new Map(
    (trackArtworkKeysResult.data ?? []).map((item: any) => [item.id, item])
  );
  const featuredBeatArtwork: Record<string, string> = {};
  const featuredTrackArtwork: Record<string, string> = {};

  await Promise.all([
    ...pipeline.map(async (beat: any) => {
      if (beat.artwork_url) featuredBeatArtwork[beat.id] = beat.artwork_url;
      const key = beatArtworkKeys.get(beat.id);
      if (!key || !isR2Configured()) return;
      try {
        featuredBeatArtwork[beat.id] = await createR2PresignedUrl("GET", String(key), 3600);
      } catch { /* keep the visual placeholder */ }
    }),
    ...(featuredTracksResult.data ?? []).map(async (track: any) => {
      const artwork = trackArtworkRows.get(track.id);
      if (artwork?.artwork_url) featuredTrackArtwork[track.id] = artwork.artwork_url;
      if (!artwork?.artwork_storage_key || !isR2Configured()) return;
      try {
        featuredTrackArtwork[track.id] = await createR2PresignedUrl("GET", artwork.artwork_storage_key, 3600);
      } catch { /* keep the visual placeholder */ }
    }),
  ]);

  const featuredTracks =
    featuredTracksResult.data ?? [];

  const featuredProducerIds = Array.from(new Set([
    ...pipeline.map((beat: any) => beat.producer_user_id),
    ...featuredTracks.map((track: any) => first(track.beats)?.producer_user_id),
  ].filter(Boolean)));
  const { data: featuredProducerProfiles = [] } = featuredProducerIds.length
    ? await admin.from("profiles").select("id,full_name,stage_name,nickname").in("id", featuredProducerIds)
    : { data: [] as any[] };
  const featuredProducers = new Map((featuredProducerProfiles ?? []).map((profile: any) => [profile.id, profile]));

  const featuredTrackAssets =
    featuredTrackAssetsResult.data ?? [];

  const featuredTrackAudio: Record<
    string,
    { assetId: string; src: string }
  > = {};

  await Promise.all(
    featuredTracks.map(async (track: any) => {
      const audioAsset = featuredTrackAssets.find(
        (asset: any) =>
          asset.entity_id === track.id &&
          asset.mime_type?.startsWith("audio/")
      );

      if (!audioAsset?.storage_path || !audioAsset.bucket_id) {
        return;
      }

      try {
        if (audioAsset.bucket_id === "r2" && isR2Configured()) {
          featuredTrackAudio[track.id] = {
            assetId: audioAsset.id,
            src: await createR2PresignedUrl(
              "GET",
              audioAsset.storage_path,
              3600
            ),
          };
        } else if (audioAsset.bucket_id !== "r2") {
          const { data } = await admin.storage
            .from(audioAsset.bucket_id)
            .createSignedUrl(audioAsset.storage_path, 3600);

          if (data?.signedUrl) {
            featuredTrackAudio[track.id] = {
              assetId: audioAsset.id,
              src: data.signedUrl,
            };
          }
        }
      } catch (cause) {
        console.error(
          `FACKTS MUSIC FEATURED TRACK AUDIO ERROR (${track.id}):`,
          cause instanceof Error ? cause.message : cause
        );
      }
    })
  );

  const peoplePreview =
    peoplePreviewResult.data ?? [];

  const progressPercent = calculateProjectProgress({ members: membersCount, beats: beatsCount, tracks: tracksCount, sessions: sessionsCount });

  const currentJourneyIndex =
    JOURNEY.reduce(
      (
        currentIndex,
        item,
        itemIndex
      ) =>
        progressPercent >=
        item.threshold
          ? itemIndex
          : currentIndex,
      0
    );

  const managementRole =
    isAdmin
      ? "Admin"
      : isProjectLead
        ? "Project Lead"
        : null;

  const roleFocus =
    isAdmin
      ? "You have full administrative oversight of Project 001 — people, music, operations and project movement."
      : isProjectLead
        ? "You are leading Project 001 — keep the people, music, sessions and next decisions moving."
        : isArtist
          ? `Your writing queue has ${myAssignments.length} assignment${
              myAssignments.length === 1
                ? ""
                : "s"
            } and ${myInterests.length} saved beat${
              myInterests.length === 1
                ? ""
                : "s"
            }.`
          : isProducer
            ? "Browse the catalog, follow artist interest and keep the next placement moving."
            : isEngineer
              ? "Follow the work from writing room to session, production and release readiness."
              : isAR
                ? "Keep the right people, songs and next decisions close at hand."
                : isFinance
                  ? "Stay close to the creative record while Project 001 moves toward release."
                  : "A shared creative home for the people, beats, sessions and work behind the music venture.";

  return (
    <AppShell>
      <div className="content creative-home">
        {/* =====================================================
            HERO
           ===================================================== */}

        <header className="creative-intro workspace-hero enter">
          <AmbientMusicAtmosphere variant="intro" />

          <div className="workspace-hero-orb workspace-hero-orb-one" />

          <div className="workspace-hero-orb workspace-hero-orb-two" />

          <div className="creative-intro-copy">
            <div className="workspace-hero-meta">
              <span className="creative-kicker">
                PROJECT 001
              </span>

              {managementRole && (
                <span className="workspace-role-chip">
                  {managementRole}
                </span>
              )}
            </div>

            <h1>
              Where the music is
              taking shape.
            </h1>

            <p>
              FACKTS Music brings the people,
              beats, sessions and work
              behind a music venture into
              one shared space.
            </p>

            <span className="creative-role-note">
              {roleFocus}
            </span>
          </div>

          <div className="creative-intro-actions">
            <Link
              href="/activity"
              className="creative-primary-action"
            >
              Explore Project

              <ArrowUpRight size={14} />
            </Link>

            <Link
              href="/beats"
              className="creative-secondary-action"
            >
              Browse Beats

              <MusicIcon size={14} />
            </Link>
          </div>
        </header>

        {/* =====================================================
            PROJECT NUMBERS
           ===================================================== */}

        <section
          className="workspace-metrics-grid enter d1"
          aria-label="Project 001 dashboard"
        >
          <article className="workspace-metric-card">
            <span className="workspace-metric-glow" />

            <div className="workspace-metric-head">
              <span>
                PEOPLE
              </span>

              <small>
                ACTIVE
              </small>
            </div>

            <strong>
              {membersCount}
            </strong>

            <p>
              Contributors in the room
            </p>

            <span className="workspace-metric-edge" />
          </article>

          <article className="workspace-metric-card">
            <span className="workspace-metric-glow" />

            <div className="workspace-metric-head">
              <span>
                BEATS
              </span>

              <small>
                CATALOG
              </small>
            </div>

            <strong>
              {beatsCount}
            </strong>

            <p>
              Registered project beats
            </p>

            <span className="workspace-metric-edge" />
          </article>

          <article className="workspace-metric-card">
            <span className="workspace-metric-glow" />

            <div className="workspace-metric-head">
              <span>
                TRACKS
              </span>

              <small>
                MUSIC
              </small>
            </div>

            <strong>
              {tracksCount}
            </strong>

            <p>
              Tracks taking shape
            </p>

            <span className="workspace-metric-edge" />
          </article>

          <article className="workspace-metric-card">
            <span className="workspace-metric-glow" />

            <div className="workspace-metric-head">
              <span>
                SESSIONS
              </span>

              <small>
                STUDIO
              </small>
            </div>

            <strong>
              {sessionsCount}
            </strong>

            <p>
              Studio sessions recorded
            </p>

            <span className="workspace-metric-edge" />
          </article>

          <article className="workspace-metric-card workspace-progress-card">
            <span className="workspace-metric-glow" />

            <div className="workspace-metric-head">
              <span>
                JOURNEY
              </span>

              <small>
                {
                  JOURNEY[
                    currentJourneyIndex
                  ].label
                }
              </small>
            </div>

            <strong>
              {progressPercent}

              <em>
                %
              </em>
            </strong>

            <p>
              Auto-calculated from people, beats, tracks and sessions
            </p>

            <div className="workspace-progress-track">
              <span
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </article>
        </section>

        {/* =====================================================
            FEATURED SESSIONS
           ===================================================== */}

        <section className="creative-section creative-sessions-section enter d2">
          <div className="creative-section-heading">
            <div>
              <span className="creative-kicker">
                IN THE ROOM
              </span>

              <h2>
                Featured Sessions
              </h2>
            </div>

            <span className="creative-section-aside">
              The work between takes
            </span>
          </div>

          <div className="session-empty-card workspace-soft-card">
            <div className="session-empty-art">
              <span>
                001
              </span>

              <div className="session-empty-wave">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="session-empty-copy">
              <span className="creative-kicker">
                SESSION SPACE
              </span>

              <h3>
                {sessionsCount > 0
                  ? `${sessionsCount} session${
                      sessionsCount === 1
                        ? ""
                        : "s"
                    } recorded`
                  : "No sessions yet"}
              </h3>

              <p>
                {sessionsCount > 0
                  ? "Open Studio Sessions to follow the latest Project 001 work."
                  : "Sessions will appear here once scheduled."}
              </p>

              <span className="preview-state">
                <ClockIcon size={13} />

                {sessionsCount > 0
                  ? "Studio activity underway"
                  : "Ready for the first session"}
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURED BEATS
           ===================================================== */}

        <section className="creative-section enter d3">
          <div className="creative-section-heading">
            <div>
              <span className="creative-kicker">
                SOUND IN VIEW
              </span>

              <h2>
                Featured Beats
              </h2>
            </div>

            <Link
              href="/beats"
              className="creative-section-link"
            >
              Browse all beats

              <ArrowUpRight size={13} />
            </Link>
          </div>

          {pipeline.length === 0 ? (
            <div className="creative-empty-state workspace-soft-card">
              <div className="creative-empty-art">
                <MusicIcon size={22} />
              </div>

              <div>
                <strong>
                  The beat wall is ready.
                </strong>

                <span>
                  Registered beats will
                  become visual cards here
                  as the catalog grows.
                </span>
              </div>

              <Link
                href="/beats"
                className="creative-secondary-action"
              >
                Open beat library

                <ArrowUpRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="featured-beats-grid">
              {pipeline.map(
                (
                  beat: any,
                  index: number
                ) => {
                  const interestCount =
                    beat.beat_interest
                      ?.length ?? 0;

                  const assignmentCount =
                    beat.beat_assignments
                      ?.length ?? 0;

                  return (
                    <article
                      className="creative-beat-card workspace-soft-card"
                      key={beat.id}
                    >
                      <div
                        className={`creative-beat-art creative-beat-art-${
                          (index % 4) + 1
                        }${featuredBeatArtwork[beat.id] ? " has-artwork" : ""}`}
                        style={featuredBeatArtwork[beat.id] ? {
                          backgroundImage: `linear-gradient(180deg, rgba(3, 9, 18, .05), rgba(3, 9, 18, .62)), url("${featuredBeatArtwork[beat.id]}")`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        } : undefined}
                      >
                        <span className="creative-beat-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <div
                          className="creative-waveform"
                          aria-hidden="true"
                        >
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>

                        <span className="creative-beat-source">
                          {beat.source_provider ||
                            "Project source"}
                        </span>
                      </div>

                      <div className="creative-beat-copy">
                        <div className="creative-beat-title-row">
                          <span className="beat-code-chip">
                            {beat.beat_code}
                          </span>

                          <span
                            className={`status-pill ${statusClass(
                              beat.status
                            )}`}
                          >
                            {beat.status ||
                              "available"}
                          </span>
                        </div>

                        <h3>
                          {beat.title ||
                            "Untitled beat"}
                        </h3>

                        <p>
                          {(() => {
                            const producer = (beat.beat_contributors || []).find((credit: any) => ["producer", "co_producer"].includes(String(credit.contribution_role).toLowerCase()));
                            return producer
                              ? creatorDisplayName(first(producer.profiles))
                              : beat.producer_user_id
                                ? creatorDisplayName(featuredProducers.get(beat.producer_user_id))
                                : beat.producer_name || "Uncredited producer";
                          })()}
                        </p>

                        <div className="creative-beat-meta">
                          <span>
                            {interestCount} interested
                          </span>

                          <span>
                            {assignmentCount} assigned
                          </span>
                        </div>

                        {featuredBeatAudio[beat.id] ? (
                          <BeatAudioPlayer
                            beatId={beat.id}
                            src={featuredBeatAudio[beat.id]}
                          />
                        ) : beat.external_url ? (
                          <a
                            href={
                              beat.external_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="creative-inline-link"
                          >
                            <PlayIcon size={12} />

                            Listen / Open Source

                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          <span className="creative-muted-link">
                            Audio source not attached
                          </span>
                        )}

                        <Link
                          href={`/beats#beat-${beat.id}`}
                          className="workspace-card-open"
                        >
                          View beat details
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            FEATURED TRACKS
           ===================================================== */}

        <section className="creative-section enter d4">
          <div className="creative-section-heading">
            <div>
              <span className="creative-kicker">
                MUSIC IN DEVELOPMENT
              </span>

              <h2>
                Featured Tracks
              </h2>
            </div>

            <Link
              href="/tracks"
              className="creative-section-link"
            >
              Open track room

              <ArrowUpRight size={13} />
            </Link>
          </div>

          {featuredTracks.length === 0 ? (
            <div className="creative-empty-state workspace-soft-card">
              <div className="creative-empty-art">
                <MusicIcon size={22} />
              </div>

              <div>
                <strong>
                  The track room is ready.
                </strong>

                <span>
                  Uploaded tracks will appear here with their source beat,
                  contributors and latest playable version.
                </span>
              </div>

              <Link
                href="/tracks"
                className="creative-secondary-action"
              >
                Open tracks

                <ArrowUpRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="featured-beats-grid featured-tracks-grid">
              {featuredTracks.map((track: any, index: number) => {
                const beat = first(track.beats);
                const contributors = track.track_contributors ?? [];
                const audio = featuredTrackAudio[track.id];

                return (
                  <article
                    className="creative-beat-card featured-track-card workspace-soft-card"
                    key={track.id}
                  >
                    <div
                      className={`creative-beat-art creative-beat-art-${
                        (index % 4) + 1
                      }${featuredTrackArtwork[track.id] ? " has-artwork" : ""}`}
                      style={featuredTrackArtwork[track.id] ? {
                        backgroundImage: `linear-gradient(180deg, rgba(3, 9, 18, .04), rgba(3, 9, 18, .64)), url("${featuredTrackArtwork[track.id]}")`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                      } : undefined}
                    >
                      <span className="creative-beat-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="creative-waveform" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>

                      <span className="creative-beat-source">
                        {beat?.beat_code || "ORIGINAL TRACK"}
                      </span>
                    </div>

                    <div className="creative-beat-copy">
                      <div className="creative-beat-title-row">
                        <span className="beat-code-chip">
                          {track.track_code || "TRACK"}
                        </span>

                        <span
                          className={`status-pill ${statusClass(
                            track.development_status || track.status
                          )}`}
                        >
                          {String(
                            track.development_status || track.status || "in development"
                          ).replaceAll("_", " ")}
                        </span>
                      </div>

                      <h3>
                        {track.working_title || "Untitled track"}
                      </h3>

                      <p>
                        {(() => {
                          const producer = contributors.find((credit: any) => ["producer", "co_producer"].includes(String(credit.contribution_role).toLowerCase()));
                          return producer
                            ? `Source beat by ${creatorDisplayName(first(producer.profiles))}`
                            : beat?.producer_user_id
                              ? `Source beat by ${creatorDisplayName(featuredProducers.get(beat.producer_user_id))}`
                              : beat?.producer_name
                                ? `Source beat by ${beat.producer_name}`
                                : "Original project track";
                        })()}
                      </p>

                      <div className="featured-track-credits">
                        {contributors.slice(0, 4).map((contributor: any) => {
                          const profile = first(contributor.profiles);
                          return (
                            <span key={contributor.id}>
                              {creatorDisplayName(profile)}
                              {" · "}
                              {String(contributor.contribution_role).replaceAll("_", " ")}
                            </span>
                          );
                        })}
                        {contributors.length > 4 && (
                          <span>+{contributors.length - 4} more</span>
                        )}
                      </div>

                      {audio ? (
                        <BeatAudioPlayer
                          beatId={audio.assetId}
                          src={audio.src}
                          eventName="track_file_played"
                          entityType="asset"
                        />
                      ) : (
                        <span className="creative-muted-link">
                          Audio version not attached
                        </span>
                      )}

                      <Link
                        href={`/tracks#track-${track.id}`}
                        className="workspace-card-open"
                      >
                        View track details
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            PEOPLE
           ===================================================== */}

        <section className="creative-section enter d4">
          <div className="creative-section-heading">
            <div>
              <span className="creative-kicker">
                THE PEOPLE
              </span>

              <h2>
                Project People
              </h2>
            </div>

            <Link
              href="/people"
              className="creative-section-link"
            >
              View All People

              <ArrowUpRight size={13} />
            </Link>
          </div>

          {peoplePreview.length === 0 ? (
            <div className="creative-mini-empty">
              Contributor profiles will
              appear here when the roster
              is connected.
            </div>
          ) : (
            <div className="creative-people-row">
              {peoplePreview.map(
                (member: any) => {
                  const profile =
                    first(
                      member.profiles
                    );

                  const memberRoles =
                    member.member_roles
                      ?.map(
                        (row: any) =>
                          first(
                            row.roles
                          )?.name
                      )
                      .filter(Boolean) ??
                    [];

                  const name = creatorDisplayName(profile);

                  const orderedMemberRoles =
                    [...memberRoles].sort(
                      (
                        a: string,
                        b: string
                      ) => {
                        const priority = [
                          "Admin",
                          "Project Lead",
                          "Finance",
                          "A&R",
                          "Producer",
                          "Engineer",
                          "Artist",
                        ];

                        const aIndex =
                          priority.indexOf(a);

                        const bIndex =
                          priority.indexOf(b);

                        return (
                          (aIndex === -1
                            ? 999
                            : aIndex) -
                          (bIndex === -1
                            ? 999
                            : bIndex)
                        );
                      }
                    );

                  return (
                    <Link
                      href={`/people/${profile?.id}`}
                      className="creative-person-card workspace-soft-card"
                      key={member.id}
                    >
                      <div className="creative-person-avatar">
                        {profile?.avatar_url ? (
                          <img
                            src={
                              profile.avatar_url
                            }
                            alt=""
                          />
                        ) : (
                          initialsFor(name)
                        )}
                      </div>

                      <strong>
                        {name}
                      </strong>

                      <span>
                        {orderedMemberRoles[0] ||
                          "Project member"}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            ACTIVITY + JOURNEY
           ===================================================== */}

        <section className="creative-split-grid creative-bottom-grid enter d5">
          <article className="creative-section creative-activity-section">
            <div className="creative-section-heading">
              <div>
                <span className="creative-kicker">
                  RECENTLY
                </span>

                <h2>
                  Latest from Project 001
                </h2>
              </div>

              <Link
                href="/activity"
                className="creative-section-link"
              >
                Open Activity

                <ArrowUpRight size={13} />
              </Link>
            </div>

            {activity.length === 0 ? (
              <div className="creative-mini-empty">
                The project&apos;s latest
                notes and movements will
                gather here.
              </div>
            ) : (
              <div className="creative-activity-list">
                {activity.map(
                  (item: any) => (
                    <div
                      className="creative-activity-item"
                      key={item.id}
                    >
                      <span className="creative-activity-mark">
                        <ActivityIcon size={13} />
                      </span>

                      <div>
                        <strong>
                          {readableAction(
                            item.action
                          )}
                        </strong>

                        <span>
                          {item.entity_type ||
                            "Project 001"}
                        </span>
                      </div>

                      <time>
                        {item.created_at
                          ? new Intl.DateTimeFormat(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                              }
                            ).format(
                              new Date(
                                item.created_at
                              )
                            )
                          : "Now"}
                      </time>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="creative-section creative-journey-section">
            <div className="creative-section-heading">
              <div>
                <span className="creative-kicker">
                  THE LONG VIEW
                </span>

                <h2>
                  Project Journey
                </h2>
              </div>

              <span className="creative-section-aside">
                {
                  JOURNEY[
                    currentJourneyIndex
                  ].label
                }{" "}
                in progress
              </span>
            </div>

            <div className="project-journey">
              {JOURNEY.map(
                (
                  item,
                  index
                ) => {
                  const complete =
                    index <
                    currentJourneyIndex;

                  const current =
                    index ===
                    currentJourneyIndex;

                  return (
                    <div
                      className={`journey-step ${
                        complete
                          ? "complete"
                          : ""
                      } ${
                        current
                          ? "current"
                          : ""
                      }`}
                      key={item.label}
                    >
                      <span className="journey-step-dot" />

                      <span className="journey-step-label">
                        {item.label}
                      </span>

                      <span className="journey-step-note">
                        {item.note}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </article>
        </section>

        {myAssignments.length > 0 && (
          <div className="workspace-assignment-note">
            <CheckCircleIcon size={14} />

            {myAssignments.length} active assignment
            {myAssignments.length === 1
              ? ""
              : "s"}
          </div>
        )}
      </div>
    </AppShell>
  );
}
