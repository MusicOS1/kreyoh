import React from "react";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import {
  addBeat,
  assignBeat,
  toggleBeatInterest,
  updateBeatStatus,
} from "./actions";
import {
  MusicIcon,
  PlayIcon,
  ExternalLinkIcon,
  UsersIcon,
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  PlusIcon,
  WaveformIcon,
  SparklesIcon,
} from "../../components/Icons";

function first(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}

const STATUSES = [
  "submitted",
  "available",
  "assigned",
  "writing",
  "ready for session",
  "recording",
  "production",
  "mixing",
  "mastering",
  "rights pending",
  "release ready",
  "completed",
];

export default async function BeatsPage() {
  const { supabase, user, project, roles } = await getWorkspace();

  if (!project) {
    return (
      <AppShell>
        <div className="content">
          <div className="empty-state">
            <h2>No active project access</h2>
            <p>Your KREYOH account is not linked to an active project.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const canAdd =
    roles.includes("Project Lead") ||
    roles.includes("Admin") ||
    roles.includes("Producer");

  const canAssign =
    roles.includes("Project Lead") ||
    roles.includes("Admin");

  const [beatsResult, membersResult] = await Promise.all([
    supabase
      .from("beats")
      .select(`
        id,
        beat_code,
        title,
        producer_name,
        source_provider,
        external_url,
        downloadable,
        status,
        writing_deadline,
        notes,
        created_at,
        beat_interest (
          id,
          user_id,
          status
        ),
        beat_assignments (
          id,
          user_id
        )
      `)
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("project_members")
      .select(`
        id,
        user_id,
        profiles (
          full_name,
          stage_name,
          email
        ),
        member_roles (
          roles (
            name
          )
        )
      `)
      .eq("project_id", project.id)
      .eq("status", "active"),
  ]);

  const beats = beatsResult.data ?? [];
  const members = membersResult.data ?? [];

  const artists = members.filter((member: any) =>
    member.member_roles?.some(
      (row: any) => first(row.roles)?.name === "Artist"
    )
  );

  // Compute stats
  const totalBeats = beats.length;
  const availableBeats = beats.filter(
    (b: any) => b.status === "available" || b.status === "submitted"
  ).length;
  const writingBeats = beats.filter(
    (b: any) => b.status === "writing" || b.status === "assigned"
  ).length;
  const totalInterestCount = beats.reduce(
    (acc: number, b: any) => acc + (b.beat_interest?.length ?? 0),
    0
  );

  return (
    <AppShell>
      <div className="content">
        {/* Page Heading */}
        <div className="heading enter">
          <div>
            <span className="eyebrow">PROJECT 001 / CATALOG</span>
            <h1>Beat Library</h1>
            <p>The official Project 001 record of submitted beats, artist interest, and writing assignments.</p>
          </div>

          <div className="date">
            <span>{totalBeats} TOTAL BEATS</span>
          </div>
        </div>

        {/* Beats Library Stats Header */}
        <div className="beats-stats-header enter d1">
          <div className="beats-stat-pill">
            <span>Total Catalog</span>
            <b>{String(totalBeats).padStart(2, "0")}</b>
          </div>
          <div className="beats-stat-pill">
            <span>Available for Writing</span>
            <b style={{ color: "var(--accent-emerald)" }}>
              {String(availableBeats).padStart(2, "0")}
            </b>
          </div>
          <div className="beats-stat-pill">
            <span>In Writing / Assigned</span>
            <b style={{ color: "var(--accent-amber)" }}>
              {String(writingBeats).padStart(2, "0")}
            </b>
          </div>
          <div className="beats-stat-pill">
            <span>Total Artist Interest</span>
            <b style={{ color: "var(--accent-violet-hover)" }}>
              {String(totalInterestCount).padStart(2, "0")}
            </b>
          </div>
        </div>

        {/* Manager/Producer: Register Beat Form */}
        {canAdd && (
          <details className="beat-intake-disclosure enter d2">
            <summary className="beat-intake-summary">
              <span><SparklesIcon size={13} /> Contributor intake</span>
              <strong>Register a Beat</strong>
              <small>Add a new sound to the catalogue when you&apos;re ready.</small>
              <b>Open form +</b>
            </summary>
            <article className="panel register-beat-panel">
              <div className="panel-header-row">
                <div className="panel-title-group">
                  <span className="eyebrow">CONTRIBUTOR INTAKE</span>
                  <h2>Register a Beat</h2>
                </div>
                <span className="phase-pill-subtle">
                  <SparklesIcon size={12} /> Intake Portal
                </span>
              </div>

            <form action={addBeat} className="beat-registration-form">
              <label className="form-label-group">
                Beat Code *
                <input
                  name="beat_code"
                  placeholder="e.g. BEAT 012"
                  required
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Working Title
                <input
                  name="title"
                  placeholder="e.g. Midnight Nairobi"
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Producer Credit
                <input
                  name="producer_name"
                  placeholder="Producer or team name"
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Source Provider
                <select
                  name="source_provider"
                  defaultValue="Google Drive"
                  className="dark-select"
                >
                  <option value="Google Drive">Google Drive</option>
                  <option value="NextBeat">NextBeat Cloud</option>
                  <option value="Supabase">Supabase Vault</option>
                  <option value="External">External Link / Streaming</option>
                </select>
              </label>

              <label className="form-label-group wide">
                Audio / Source URL
                <input
                  name="external_url"
                  type="url"
                  placeholder="https://drive.google.com/... or soundcloud.com/..."
                  className="dark-input"
                />
              </label>

              <label className="form-label-group wide">
                Beat Notes & Key/BPM Details
                <textarea
                  name="notes"
                  placeholder="e.g. 120 BPM, G Minor, Dark Afro-fusion vibe with space for 2 verses..."
                  rows={2}
                  className="dark-textarea"
                />
              </label>

              <label className="dark-checkbox-label">
                <input
                  name="downloadable"
                  type="checkbox"
                  defaultChecked
                />
                Allow Project Download
              </label>

              <button className="submit-beat-btn" type="submit">
                + Register to Library
              </button>
            </form>
            </article>
          </details>
        )}

        {/* Beat Cards Grid */}
        <section className="beats-grid-cards enter d3">
          {beats.length === 0 ? (
            <article className="panel empty-state" style={{ gridColumn: "1 / -1" }}>
              <h2>No beats registered yet</h2>
              <p>Add the first official Project 001 instrumental beat to open artist interest and writing assignments.</p>
            </article>
          ) : (
            beats.map((beat: any) => {
              const interested = beat.beat_interest ?? [];
              const assignments = beat.beat_assignments ?? [];
              const iAmInterested = interested.some(
                (row: any) => row.user_id === user.id
              );

              return (
                <article className="beat-card-deck" key={beat.id}>
                  <div className={`beat-card-artwork beat-card-artwork-${(beats.indexOf(beat) % 4) + 1}`} aria-label={`${beat.beat_code} artwork placeholder`}>
                    <span className="beat-artwork-index">{String(beats.indexOf(beat) + 1).padStart(2, "0")}</span>
                    <div className="beat-artwork-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
                    <span className="beat-artwork-caption">PROJECT 001 / SOUND</span>
                  </div>
                  {/* Top Identification Row */}
                  <div className="beat-card-top-row">
                    <div className="beat-card-identity">
                      <span className="beat-code-chip">{beat.beat_code}</span>
                      <h3 className="beat-card-title">{beat.title || "Untitled Beat"}</h3>
                      <span className="beat-card-producer">
                        Producer: <strong>{beat.producer_name || "Uncredited"}</strong>
                      </span>
                    </div>

                    <span className={`status-pill ${statusClass(beat.status)}`}>
                      {beat.status}
                    </span>
                  </div>

                  {/* Audio Player Surface Area */}
                  <div className="beat-audio-deck">
                    <div className="beat-audio-left">
                      <div className="waveform-mini-visual" title="Audio Waveform Motif">
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                        <span className="waveform-bar" />
                      </div>
                      <span className="audio-provider-tag">
                        {beat.source_provider || "Source"}
                      </span>
                    </div>

                    {beat.external_url ? (
                      <a
                        href={beat.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="beat-audio-action-link"
                        title="Listen to beat audio stream"
                      >
                        <PlayIcon size={12} />
                        <span>Listen to Source</span>
                        <ExternalLinkIcon size={11} />
                      </a>
                    ) : (
                      <span className="no-audio-text">No audio URL attached</span>
                    )}
                  </div>

                  {/* Metadata Matrix */}
                  <div className="beat-stats-matrix">
                    <div className="beat-stat-col">
                      <b>{interested.length}</b>
                      <span>Interested</span>
                    </div>

                    <div className="beat-stat-col">
                      <b>{assignments.length}</b>
                      <span>Assigned</span>
                    </div>

                    <div
                      className={`beat-stat-col deadline ${
                        beat.writing_deadline ? "urgent" : ""
                      }`}
                    >
                      <b>
                        {beat.writing_deadline
                          ? new Date(beat.writing_deadline).toLocaleDateString("en-KE", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "—"}
                      </b>
                      <span>Writing Deadline</span>
                    </div>
                  </div>

                  {/* Artist Interest Button */}
                  <form action={toggleBeatInterest}>
                    <input type="hidden" name="beat_id" value={beat.id} />
                    <input type="hidden" name="beat_code" value={beat.beat_code} />

                    <button
                      className={`interest-button-glow ${iAmInterested ? "active" : ""}`}
                      type="submit"
                    >
                      {iAmInterested ? (
                        <>
                          <CheckCircleIcon size={14} />
                          <span>I&apos;m Interested (Registered)</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon size={14} />
                          <span>I&apos;m Interested</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Manager Controls: Assign Artist & Update Stage */}
                  {(canAssign || canAdd) && (
                    <div className="beat-management-controls">
                      {/* Assign Form for Leads/Admins */}
                      {canAssign && (
                        <form action={assignBeat} className="mgmt-form-row">
                          <input type="hidden" name="beat_id" value={beat.id} />
                          <input type="hidden" name="beat_code" value={beat.beat_code} />

                          <select
                            name="artist_user_id"
                            required
                            defaultValue=""
                            className="mgmt-select"
                          >
                            <option value="" disabled>
                              Select Artist to Assign...
                            </option>
                            {artists.map((member: any) => {
                              const profile = first(member.profiles);
                              const name =
                                profile?.stage_name ||
                                profile?.full_name ||
                                profile?.email ||
                                "Artist";
                              return (
                                <option key={member.user_id} value={member.user_id}>
                                  {name}
                                </option>
                              );
                            })}
                          </select>

                          <input
                            name="writing_deadline"
                            type="date"
                            className="mgmt-date-input"
                            title="Writing Deadline"
                          />

                          <button type="submit" className="mgmt-action-btn">
                            Assign
                          </button>
                        </form>
                      )}

                      {/* Status Form for Managers/Producers */}
                      {canAdd && (
                        <form action={updateBeatStatus} className="mgmt-form-row status-row">
                          <input type="hidden" name="beat_id" value={beat.id} />
                          <input type="hidden" name="beat_code" value={beat.beat_code} />

                          <select
                            name="status"
                            defaultValue={beat.status}
                            className="mgmt-select"
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>
                                Stage: {st.toUpperCase()}
                              </option>
                            ))}
                          </select>

                          <button type="submit" className="mgmt-action-btn">
                            Update Stage
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
