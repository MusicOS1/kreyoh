import Link from "next/link";
import AdminMusicCatalogManager from "../../../../components/AdminMusicCatalogManager";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { resolveArtworkUrl } from "../../../../lib/artwork";

const first = (value: any) => (Array.isArray(value) ? value[0] : value);
const label = (value?: string) => (value || "pending").replaceAll("_", " ");
const DEFAULT_PROJECT_COVER = "/images/project-001-default-cover.png";
const PAGE_SIZE = 15;

type TrackArtworkRow = {
  id: string;
  artwork_url: string | null;
  artwork_storage_key: string | null;
};

export default async function AdminOperations({
  searchParams,
}: {
  searchParams: Promise<{
    beatPage?: string;
    trackPage?: string;
    q?: string;
  }>;
}) {
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
    const safeSearch = search.replaceAll(",", " ").replaceAll("%", "");

    adminBeatsQuery = adminBeatsQuery.or(
      `title.ilike.%${safeSearch}%,beat_code.ilike.%${safeSearch}%,producer_name.ilike.%${safeSearch}%`,
    );

    adminTracksQuery = adminTracksQuery.or(
      `working_title.ilike.%${safeSearch}%,track_code.ilike.%${safeSearch}%`,
    );
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
    admin
      .from("studio_sessions")
      .select("id,starts_at,location,status,projects(name),tracks(working_title)")
      .order("starts_at", { ascending: false })
      .limit(8),
    admin
      .from("project_tasks")
      .select(
        "id,title,status,due_date,projects(name),profiles!project_tasks_assignee_id_fkey(full_name,stage_name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("project_members")
      .select("project_id,user_id,profiles(full_name,stage_name)")
      .eq("status", "active"),
    admin
      .from("beat_contributors")
      .select("id,beat_id,user_id,contribution_role"),
    admin
      .from("track_contributors")
      .select("id,track_id,user_id,contribution_role"),
    admin.from("beats").select("id,artwork_storage_key"),
    admin.from("tracks").select("id,artwork_url,artwork_storage_key"),
    admin
      .from("beats")
      .select("id,project_id,title,beat_code")
      .order("created_at", { ascending: false }),
  ]);

  const beats = beatsResult.data ?? [];
  const tracks = tracksResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const beatCredits = beatCreditsResult.data ?? [];
  const trackCredits = trackCreditsResult.data ?? [];

  const beatArtwork = new Map(
    (beatArtworkResult.data ?? []).map((item: any) => [
      item.id,
      item.artwork_storage_key,
    ]),
  );

  const trackArtworkRows = (trackArtworkResult.data ?? []) as TrackArtworkRow[];
  const beatOptions = beatOptionsResult.data ?? [];

  const trackArtwork = new Map<string, TrackArtworkRow>(
    trackArtworkRows.map((item) => [item.id, item]),
  );

  const signedArtwork = new Map<string, string>();

  await Promise.all([
    ...beats.map(async (beat: any) => {
      const key = beatArtwork.get(beat.id);

      try {
        const url = await resolveArtworkUrl(
          key ? String(key) : null,
          beat.artwork_url,
        );

        if (url) signedArtwork.set(`beat:${beat.id}`, url);
      } catch {
        // Use placeholder artwork.
      }
    }),

    ...tracks.map(async (track: any) => {
      const artwork = trackArtwork.get(track.id);

      try {
        const url = await resolveArtworkUrl(
          artwork?.artwork_storage_key ?? null,
          artwork?.artwork_url ?? null,
        );

        if (url) signedArtwork.set(`track:${track.id}`, url);
      } catch {
        // Use placeholder artwork.
      }
    }),
  ]);

  const members = (membersResult.data ?? []).map((membership: any) => {
    const profile = first(membership.profiles);

    return {
      id: membership.user_id,
      projectId: membership.project_id,
      name:
        profile?.stage_name ||
        profile?.full_name ||
        "Project member",
    };
  });

  const records = [
    ...beats.map((beat: any) => ({
      id: beat.id,
      type: "beat" as const,
      projectId: beat.project_id,
      projectName: first(beat.projects)?.name || "No project",
      title: beat.title || "Untitled beat",
      code: beat.beat_code || "BEAT",
      status: beat.status || "available",
      artworkUrl:
        signedArtwork.get(`beat:${beat.id}`) ||
        beat.artwork_url ||
        DEFAULT_PROJECT_COVER,
      metadata: {
        producer_name: beat.producer_name,
        bpm: beat.bpm,
        musical_key: beat.musical_key,
        genre_tags: beat.genre_tags,
        mood_tags: beat.mood_tags,
        description: beat.description,
        artist_capacity: beat.artist_capacity,
        source_type: beat.source_type,
        external_url: beat.external_url,
      },
      credits: beatCredits
        .filter((credit: any) => credit.beat_id === beat.id)
        .map((credit: any) => ({
          id: credit.id,
          userId: credit.user_id,
          role: credit.contribution_role,
        })),
    })),

    ...tracks.map((track: any) => ({
      id: track.id,
      type: "track" as const,
      projectId: track.project_id,
      projectName: first(track.projects)?.name || "No project",
      title: track.working_title || "Untitled track",
      code: track.track_code || "TRACK",
      status: track.development_status || "in_development",
      artworkUrl:
        signedArtwork.get(`track:${track.id}`) ||
        trackArtwork.get(track.id)?.artwork_url ||
        DEFAULT_PROJECT_COVER,
      metadata: {
        beat_id: track.beat_id,
      },
      beatOptions: beatOptions
        .filter((beat: any) => beat.project_id === track.project_id)
        .map((beat: any) => ({
          id: beat.id,
          label: beat.title || beat.beat_code || "Beat",
        })),
      credits: trackCredits
        .filter((credit: any) => credit.track_id === track.id)
        .map((credit: any) => ({
          id: credit.id,
          userId: credit.user_id,
          role: credit.contribution_role,
        })),
    })),
  ];

  const sections = [
    {
      title: "Beat library",
      eyebrow: "MUSIC INTAKE",
      href: "/beats",
      items: beats.slice(0, 8).map((item: any) => ({
        id: item.id,
        name: item.title || item.beat_code || "Untitled beat",
        meta: `${item.producer_name || "Producer pending"} / ${
          first(item.projects)?.name || "No project"
        }`,
        status: item.status,
      })),
    },
    {
      title: "Tracks in development",
      eyebrow: "CATALOGUE",
      href: "/tracks",
      items: tracks.slice(0, 8).map((item: any) => ({
        id: item.id,
        name: item.working_title || item.track_code || "Untitled track",
        meta: first(item.projects)?.name || "No project",
        status: item.development_status,
      })),
    },
    {
      title: "Studio sessions",
      eyebrow: "ROOMS",
      href: "/studio-sessions",
      items: sessions.map((item: any) => ({
        id: item.id,
        name: first(item.tracks)?.working_title || "Project session",
        meta: `${new Date(item.starts_at).toLocaleString("en-KE")} / ${
          item.location || "Location pending"
        }`,
        status: item.status,
      })),
    },
    {
      title: "Actions and delivery",
      eyebrow: "WORK",
      href: "/tasks",
      items: tasks.map((item: any) => ({
        id: item.id,
        name: item.title,
        meta: `${
          first(item.profiles)?.stage_name ||
          first(item.profiles)?.full_name ||
          "Unassigned"
        }${item.due_date ? ` / due ${item.due_date}` : ""}`,
        status: item.status,
      })),
    },
  ];

  return (
    <>
      <style>{`
        .fm-search-shell {
          position: relative;
          margin: 28px 0 34px;
          padding: 1px;
          border-radius: 24px;
          background: linear-gradient(
            115deg,
            rgba(255, 255, 255, 0.22),
            rgba(255, 255, 255, 0.045) 45%,
            rgba(255, 122, 0, 0.38)
          );
          box-shadow:
            0 26px 80px rgba(0, 0, 0, 0.32),
            0 0 0 1px rgba(255,255,255,0.025);
        }

        .fm-search-panel {
          position: relative;
          overflow: hidden;
          border-radius: 23px;
          padding: 22px;
          background:
            radial-gradient(circle at 85% 15%, rgba(255,122,0,0.12), transparent 33%),
            linear-gradient(135deg, rgba(18,18,20,0.97), rgba(8,8,10,0.99));
        }

        .fm-search-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.58), transparent 88%);
        }

        .fm-search-kicker {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .fm-search-kicker-left {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.52);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .fm-search-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #ff7a00;
          box-shadow: 0 0 0 4px rgba(255,122,0,0.11), 0 0 18px rgba(255,122,0,0.46);
        }

        .fm-search-count {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .fm-search-form {
          position: relative;
          z-index: 1;
        }

        .fm-search-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fm-search-field {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
        }

        .fm-search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          width: 20px;
          height: 20px;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.42);
          pointer-events: none;
          transition: color 180ms ease, transform 180ms ease;
        }

        .fm-search-field:focus-within .fm-search-icon {
          color: #ff8a1c;
          transform: translateY(-50%) scale(1.03);
        }

        .fm-search-input {
          width: 100%;
          height: 60px;
          padding: 0 52px 0 56px;
          border: 1px solid rgba(255,255,255,0.095);
          border-radius: 17px;
          outline: none;
          background: rgba(255,255,255,0.052);
          color: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.035),
            0 12px 30px rgba(0,0,0,0.16);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.005em;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .fm-search-input::placeholder {
          color: rgba(255,255,255,0.30);
          font-weight: 500;
        }

        .fm-search-input:focus {
          border-color: rgba(255,138,28,0.48);
          background: rgba(255,255,255,0.068);
          box-shadow:
            0 0 0 4px rgba(255,122,0,0.07),
            inset 0 1px 0 rgba(255,255,255,0.045),
            0 15px 38px rgba(0,0,0,0.22);
        }

        .fm-search-input::-webkit-search-cancel-button {
          display: none;
        }

        .fm-search-clear-x {
          position: absolute;
          right: 15px;
          top: 50%;
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          transform: translateY(-50%);
          border-radius: 10px;
          color: rgba(255,255,255,0.46);
          text-decoration: none;
          font-size: 18px;
          line-height: 1;
          transition: background 160ms ease, color 160ms ease;
        }

        .fm-search-clear-x:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        .fm-search-button {
          height: 60px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 24px;
          border: 1px solid rgba(255,161,70,0.55);
          border-radius: 17px;
          background: linear-gradient(180deg, #ff922e, #f57400);
          color: #15100b;
          box-shadow:
            0 12px 30px rgba(245,116,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.36);
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }

        .fm-search-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.04);
          box-shadow:
            0 16px 34px rgba(245,116,0,0.28),
            inset 0 1px 0 rgba(255,255,255,0.40);
        }

        .fm-search-button svg {
          width: 16px;
          height: 16px;
        }

        .fm-search-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 12px;
          padding: 0 2px;
          color: rgba(255,255,255,0.34);
          font-size: 10px;
          font-weight: 650;
          letter-spacing: 0.055em;
        }

        .fm-search-footer strong {
          color: rgba(255,255,255,0.66);
          font-weight: 750;
        }

        .fm-search-tags {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .fm-search-tag {
          padding: 5px 8px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 999px;
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.36);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        @media (max-width: 760px) {
          .fm-search-shell {
            margin: 20px 0 26px;
            border-radius: 20px;
          }

          .fm-search-panel {
            border-radius: 19px;
            padding: 16px;
          }

          .fm-search-row {
            align-items: stretch;
          }

          .fm-search-input {
            height: 54px;
            padding-left: 50px;
            font-size: 13px;
          }

          .fm-search-button {
            width: 54px;
            height: 54px;
            padding: 0;
            border-radius: 15px;
          }

          .fm-search-button span {
            display: none;
          }

          .fm-search-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .fm-search-tags {
            display: none;
          }

          .fm-search-count {
            display: none;
          }
        }
      `}</style>

      <section className="control-page-hero operations">
        <span className="control-eyebrow">MUSIC OPERATIONS</span>
        <h1>Manage the catalogue.</h1>
        <p>
          Control official credits, cover images and the records moving through
          FACKTS Music. These destructive controls are visible only inside the
          private Control Room.
        </p>
      </section>

      <section className="fm-search-shell" aria-label="Catalogue search">
        <div className="fm-search-panel">
          <div className="fm-search-kicker">
            <div className="fm-search-kicker-left">
              <span className="fm-search-live-dot" />
              Catalogue Intelligence
            </div>

            <span className="fm-search-count">
              {(beatsResult.count || 0) + (tracksResult.count || 0)} records
            </span>
          </div>

          <form
            method="GET"
            action="/admin/operations"
            className="fm-search-form"
          >
            <div className="fm-search-row">
              <div className="fm-search-field">
                <svg
                  className="fm-search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.6-3.6" />
                </svg>

                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Search tracks, beats, producers or catalogue codes"
                  className="fm-search-input"
                  autoComplete="off"
                  aria-label="Search music operations catalogue"
                />

                {search ? (
                  <Link
                    href="/admin/operations"
                    className="fm-search-clear-x"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </Link>
                ) : null}
              </div>

              <button type="submit" className="fm-search-button">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span>Search</span>
              </button>
            </div>

            <div className="fm-search-footer">
              <span>
                {search ? (
                  <>
                    Results filtered for <strong>“{search}”</strong>
                  </>
                ) : (
                  <>
                    Search across the active <strong>music catalogue</strong>
                  </>
                )}
              </span>

              <div className="fm-search-tags" aria-hidden="true">
                <span className="fm-search-tag">Tracks</span>
                <span className="fm-search-tag">Beats</span>
                <span className="fm-search-tag">Producers</span>
                <span className="fm-search-tag">Codes</span>
              </div>
            </div>
          </form>
        </div>
      </section>

      <AdminMusicCatalogManager
        records={records}
        members={members}
        beatTotal={beatsResult.count || 0}
        trackTotal={tracksResult.count || 0}
        beatPage={beatPage}
        trackPage={trackPage}
        pageSize={PAGE_SIZE}
        query={search}
      />

      <section className="control-operation-grid">
        {sections.map((section) => (
          <article className="control-panel" key={section.title}>
            <header>
              <div>
                <span className="control-eyebrow">{section.eyebrow}</span>
                <h2>{section.title}</h2>
              </div>
              <Link href={section.href}>Open workspace</Link>
            </header>

            <div className="control-table">
              {!section.items.length && (
                <p className="control-empty">No records yet.</p>
              )}

              {section.items.map(
                (item: {
                  id: string;
                  name: string;
                  meta: string;
                  status?: string;
                }) => (
                  <div className="control-row" key={item.id}>
                    <span className="control-activity-dot" />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.meta}</small>
                    </div>
                    <span className="control-status">
                      {label(item.status)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
