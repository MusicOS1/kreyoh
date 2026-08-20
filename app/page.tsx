import React from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import { getWorkspace } from "../lib/workspace";
import {
  ActivityIcon,
  ArrowUpRight,
  CheckCircleIcon,
  ClockIcon,
  MusicIcon,
  PlayIcon,
  UsersIcon,
} from "../components/Icons";

function first(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function statusClass(status: string | null | undefined) {
  return String(status || "available").toLowerCase().replaceAll(" ", "-");
}

function readableAction(action: string | null | undefined) {
  return String(action || "Project activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  { label: "Started", note: "The project takes shape", threshold: 0 },
  { label: "Beats", note: "The sound finds its palette", threshold: 12 },
  { label: "Writing", note: "Ideas become songs", threshold: 28 },
  { label: "Sessions", note: "The room comes alive", threshold: 45 },
  { label: "Production", note: "Details become direction", threshold: 62 },
  { label: "Rights", note: "The record is protected", threshold: 80 },
  { label: "Release", note: "The work meets the world", threshold: 94 },
];

export default async function Home() {
  const { supabase, user, project, roles } = await getWorkspace();

  if (!project) {
    return (
      <AppShell>
        <div className="content">
          <div className="empty-state">
            <h2>No active project access</h2>
            <p>Your KREYOH account exists, but it has not yet been linked to Project 001.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const isArtist = roles.includes("Artist");
  const isProducer = roles.includes("Producer");
  const isEngineer = roles.includes("Engineer");
  const isAR = roles.includes("A&R") || roles.includes("AR");
  const isFinance = roles.includes("Finance");

  const [membersResult, beatsResult, tracksResult, myAssignmentsResult, myInterestResult, activityResult, pipelineResult, peoplePreviewResult] = await Promise.all([
    supabase
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "active"),
    supabase
      .from("beats")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("beat_assignments")
      .select(`
        id,
        beat_id,
        beats ( id, beat_code, title, status, writing_deadline, external_url, producer_name )
      `)
      .eq("user_id", user.id)
      .limit(6),
    supabase
      .from("beat_interest")
      .select(`
        id,
        beat_id,
        beats ( id, beat_code, title, status, producer_name, external_url )
      `)
      .eq("user_id", user.id)
      .limit(6),
    supabase
      .from("activity_log")
      .select("id, action, created_at, entity_type")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("beats")
      .select(`
        id,
        beat_code,
        title,
        producer_name,
        status,
        writing_deadline,
        external_url,
        source_provider,
        beat_interest ( id ),
        beat_assignments ( id )
      `)
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("project_members")
      .select(`
        id,
        status,
        joined_at,
        profiles ( id, full_name, stage_name, email, avatar_url ),
        member_roles ( roles ( name ) )
      `)
      .eq("project_id", project.id)
      .order("joined_at", { ascending: true })
      .limit(6),
  ]);

  const membersCount = membersResult.count ?? 0;
  const beatsCount = beatsResult.count ?? 0;
  const tracksCount = tracksResult.count ?? 0;
  const myAssignments = myAssignmentsResult.data ?? [];
  const myInterests = myInterestResult.data ?? [];
  const activity = activityResult.data ?? [];
  const pipeline = pipelineResult.data ?? [];
  const peoplePreview = peoplePreviewResult.data ?? [];
  const progressPercent = Math.max(0, Math.min(project.progress ?? 42, 100));
  const currentJourneyIndex = JOURNEY.reduce(
    (index, item, itemIndex) => (progressPercent >= item.threshold ? itemIndex : index),
    0
  );

  const roleFocus = isArtist
    ? `Your writing queue has ${myAssignments.length} assignment${myAssignments.length === 1 ? "" : "s"} and ${myInterests.length} saved beat${myInterests.length === 1 ? "" : "s"}.`
    : isProducer
      ? "Browse the catalog, follow artist interest, and keep the next placement moving."
      : isEngineer
        ? "Follow the work from writing room to session, production, and release readiness."
        : isAR
          ? "Keep the right people, songs, and next decisions close at hand."
          : isFinance
            ? "Stay close to the creative record while the project moves toward its next release milestone."
            : "A shared creative home for the people, beats, sessions and work behind a music venture.";

  return (
    <AppShell>
      <div className="content creative-home">
        <header className="creative-intro enter">
          <div className="creative-intro-copy">
            <span className="creative-kicker">PROJECT 001</span>
            <h1>Where the music is taking shape.</h1>
            <p>KREYOH brings the people, beats, sessions and work behind a music venture into one shared space.</p>
            <span className="creative-role-note">{roleFocus}</span>
          </div>
          <div className="creative-intro-actions">
            <Link href="/activity" className="creative-primary-action">Explore Project <ArrowUpRight size={14} /></Link>
            <Link href="/beats" className="creative-secondary-action">Browse Beats <MusicIcon size={14} /></Link>
          </div>
        </header>

        <section className="creative-section creative-sessions-section enter d1">
          <div className="creative-section-heading">
            <div><span className="creative-kicker">IN THE ROOM</span><h2>Featured Sessions</h2></div>
            <span className="creative-section-aside">The work between takes</span>
          </div>
          <div className="session-empty-card">
            <div className="session-empty-art"><span>001</span><div className="session-empty-wave"><i /><i /><i /><i /><i /><i /><i /></div></div>
            <div className="session-empty-copy">
              <span className="creative-kicker">SESSION SPACE</span>
              <h3>No sessions yet</h3>
              <p>Sessions will appear here once scheduled.</p>
              <span className="preview-state"><ClockIcon size={13} /> Ready for the first session</span>
            </div>
          </div>
        </section>

        <div className="creative-count-row enter d2" aria-label="Project overview">
          <div><strong>{beatsCount}</strong><span>Beats</span></div>
          <div><strong>{membersCount}</strong><span>People</span></div>
          <div><strong>{tracksCount}</strong><span>Tracks</span></div>
          <div><strong>—</strong><span>Sessions</span></div>
          {myAssignments.length > 0 && <div className="creative-count-note"><CheckCircleIcon size={13} /> {myAssignments.length} active assignment{myAssignments.length === 1 ? "" : "s"}</div>}
        </div>

        <section className="creative-section enter d3">
          <div className="creative-section-heading">
            <div><span className="creative-kicker">SOUND IN VIEW</span><h2>Featured Beats</h2></div>
            <Link href="/beats" className="creative-section-link">Browse all beats <ArrowUpRight size={13} /></Link>
          </div>
          {pipeline.length === 0 ? (
            <div className="creative-empty-state">
              <div className="creative-empty-art"><MusicIcon size={22} /></div>
              <div><strong>The beat wall is ready.</strong><span>Registered beats will become visual cards here as the catalog grows.</span></div>
              <Link href="/beats" className="creative-secondary-action">Open beat library <ArrowUpRight size={13} /></Link>
            </div>
          ) : (
            <div className="featured-beats-grid">
              {pipeline.map((beat: any, index: number) => {
                const interestCount = beat.beat_interest?.length ?? 0;
                const assignCount = beat.beat_assignments?.length ?? 0;
                return (
                  <article className="creative-beat-card" key={beat.id}>
                    <div className={`creative-beat-art creative-beat-art-${(index % 4) + 1}`}>
                      <span className="creative-beat-number">{String(index + 1).padStart(2, "0")}</span>
                      <div className="creative-waveform" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
                      <span className="creative-beat-source">{beat.source_provider || "Project source"}</span>
                    </div>
                    <div className="creative-beat-copy">
                      <div className="creative-beat-title-row">
                        <span className="beat-code-chip">{beat.beat_code}</span>
                        <span className={`status-pill ${statusClass(beat.status)}`}>{beat.status || "available"}</span>
                      </div>
                      <h3>{beat.title || "Untitled beat"}</h3>
                      <p>{beat.producer_name || "Uncredited producer"}</p>
                      <div className="creative-beat-meta"><span>{interestCount} interested</span><span>{assignCount} assigned</span></div>
                      {beat.external_url ? <a href={beat.external_url} target="_blank" rel="noreferrer" className="creative-inline-link"><PlayIcon size={12} /> Listen / Open Source <ArrowUpRight size={12} /></a> : <span className="creative-muted-link">Audio source not attached</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="creative-section enter d4">
          <div className="creative-section-heading">
            <div><span className="creative-kicker">THE PEOPLE</span><h2>Project People</h2></div>
            <Link href="/people" className="creative-section-link">View All People <ArrowUpRight size={13} /></Link>
          </div>
          {peoplePreview.length === 0 ? (
            <div className="creative-mini-empty">Contributor profiles will appear here when the roster is connected.</div>
          ) : (
            <div className="creative-people-row">
              {peoplePreview.map((member: any) => {
                const profile = first(member.profiles);
                const memberRoles = member.member_roles?.map((row: any) => first(row.roles)?.name).filter(Boolean) ?? [];
                const name = profile?.stage_name || profile?.full_name || profile?.email || "Project member";
                return (
                  <Link href="/people" className="creative-person-card" key={member.id}>
                    <div className="creative-person-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initialsFor(name)}</div>
                    <strong>{name}</strong>
                    <span>{memberRoles[0] || "Project member"}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="creative-split-grid creative-bottom-grid enter d5">
          <article className="creative-section creative-activity-section">
            <div className="creative-section-heading">
              <div><span className="creative-kicker">RECENTLY</span><h2>Latest from Project 001</h2></div>
              <Link href="/activity" className="creative-section-link">Open Activity <ArrowUpRight size={13} /></Link>
            </div>
            {activity.length === 0 ? (
              <div className="creative-mini-empty">The project&apos;s latest notes and movements will gather here.</div>
            ) : (
              <div className="creative-activity-list">
                {activity.map((item: any) => (
                  <div className="creative-activity-item" key={item.id}>
                    <span className="creative-activity-mark"><ActivityIcon size={13} /></span>
                    <div><strong>{readableAction(item.action)}</strong><span>{item.entity_type || "Project 001"}</span></div>
                    <time>{item.created_at ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(item.created_at)) : "Now"}</time>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="creative-section creative-journey-section">
            <div className="creative-section-heading">
              <div><span className="creative-kicker">THE LONG VIEW</span><h2>Project Journey</h2></div>
              <span className="creative-section-aside">{JOURNEY[currentJourneyIndex].label} in progress</span>
            </div>
            <div className="project-journey">
              {JOURNEY.map((item, index) => {
                const complete = index < currentJourneyIndex;
                const current = index === currentJourneyIndex;
                return (
                  <div className={`journey-step ${complete ? "complete" : ""} ${current ? "current" : ""}`} key={item.label}>
                    <span className="journey-step-dot" />
                    <span className="journey-step-label">{item.label}</span>
                    <span className="journey-step-note">{item.note}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
