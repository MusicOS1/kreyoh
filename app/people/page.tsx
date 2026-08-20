import React from "react";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { addContributor } from "./actions";
import {
  UsersIcon,
  ClockIcon,
  PlusIcon,
  UserIcon,
  SparklesIcon,
  BriefcaseIcon,
  CheckCircleIcon,
} from "../../components/Icons";

function first(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function getRoleClass(roleName: string) {
  const lower = roleName.toLowerCase();
  if (lower.includes("artist")) return "artist";
  if (lower.includes("producer")) return "producer";
  if (lower.includes("lead") || lower.includes("admin")) return "lead";
  if (lower.includes("engineer")) return "engineer";
  if (lower.includes("a&r") || lower.includes("ar")) return "ar";
  if (lower.includes("finance")) return "finance";
  return "";
}

const AVAILABLE_ROLES = [
  "Artist",
  "Producer",
  "Engineer",
  "A&R",
  "Project Lead",
  "Admin",
  "Finance",
];

export default async function PeoplePage() {
  const { supabase, project, roles } = await getWorkspace();

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

  const canAddPeople = roles.includes("Project Lead") || roles.includes("Admin");

  // Query project members
  const { data: members } = await supabase
    .from("project_members")
    .select(`
      id,
      status,
      joined_at,
      profiles (
        id,
        full_name,
        stage_name,
        email,
        phone,
        avatar_url
      ),
      member_roles (
        roles (
          name
        )
      )
    `)
    .eq("project_id", project.id)
    .order("joined_at", { ascending: true });

  const roster = members ?? [];

  // Breakdown counts
  const totalCount = roster.length;
  const artistCount = roster.filter((m: any) =>
    m.member_roles?.some((r: any) => first(r.roles)?.name === "Artist")
  ).length;
  const producerCount = roster.filter((m: any) =>
    m.member_roles?.some((r: any) => first(r.roles)?.name === "Producer")
  ).length;
  const engineerCount = roster.filter((m: any) =>
    m.member_roles?.some((r: any) => first(r.roles)?.name === "Engineer")
  ).length;
  const leadCount = roster.filter((m: any) =>
    m.member_roles?.some(
      (r: any) =>
        first(r.roles)?.name === "Project Lead" ||
        first(r.roles)?.name === "Admin"
    )
  ).length;

  return (
    <AppShell>
      <div className="content">
        {/* Page Heading */}
        <div className="heading enter">
          <div>
            <span className="eyebrow">PROJECT 001 / DIRECTORY</span>
            <h1>Project People</h1>
            <p>
              The people shaping the sound, story, and next chapter of Project 001.
            </p>
          </div>

          <div className="date">
            <span>{totalCount} TOTAL CONTRIBUTORS</span>
          </div>
        </div>

        {/* Role Breakdown Header Pills */}
        <div className="beats-stats-header enter d1">
          <div className="beats-stat-pill">
            <span>Total Contributors</span>
            <b>{String(totalCount).padStart(2, "0")}</b>
          </div>
          <div className="beats-stat-pill">
            <span>Artists / Topliners</span>
            <b style={{ color: "var(--accent-violet-hover)" }}>
              {String(artistCount).padStart(2, "0")}
            </b>
          </div>
          <div className="beats-stat-pill">
            <span>Producers & Composers</span>
            <b style={{ color: "var(--accent-amber)" }}>
              {String(producerCount).padStart(2, "0")}
            </b>
          </div>
          <div className="beats-stat-pill">
            <span>Engineers & Leads</span>
            <b style={{ color: "var(--accent-emerald)" }}>
              {String(engineerCount + leadCount).padStart(2, "0")}
            </b>
          </div>
        </div>

        {/* Admin / Project Lead: Add Contributor Onboarding Form */}
        {canAddPeople && (
          <article className="panel register-beat-panel enter d2">
            <div className="panel-header-row">
              <div className="panel-title-group">
                <span className="eyebrow">ONBOARDING WORKFLOW</span>
                <h2>Bring someone into the room</h2>
              </div>
              <span className="phase-pill-subtle">
                <PlusIcon size={12} /> Lead Action
              </span>
            </div>

            <form action={addContributor} className="beat-registration-form">
              <label className="form-label-group">
                Full Legal / Official Name *
                <input
                  name="full_name"
                  placeholder="e.g. John Doe"
                  required
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Stage / Professional Name
                <input
                  name="stage_name"
                  placeholder="e.g. Monokid / Gish"
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Authenticated Email *
                <input
                  name="email"
                  type="email"
                  placeholder="contributor@example.com"
                  required
                  className="dark-input"
                />
                <span className="settings-readonly-note">Existing authenticated profiles are linked immediately. Unknown emails are recorded as Pending Invite without creating a fake account.</span>
              </label>

              <label className="form-label-group">
                Primary Venture Role *
                <select
                  name="primary_role"
                  defaultValue="Artist"
                  className="dark-select"
                >
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label-group">
                Phone / WhatsApp (Optional)
                <input
                  name="phone"
                  type="tel"
                  placeholder="+254 7..."
                  className="dark-input"
                />
              </label>

              <label className="form-label-group">
                Initial Status
                <select
                  name="status"
                  defaultValue="active"
                  className="dark-select"
                >
                  <option value="active">Active Contributor</option>
                  <option value="pending">Pending Invite</option>
                  <option value="invited">Invited / Awaiting Confirmation</option>
                </select>
              </label>

              <label className="form-label-group wide">
                Additional Roles (Comma-separated)
                <input
                  name="additional_roles"
                  placeholder="e.g. Producer, Engineer, Songwriter"
                  className="dark-input"
                />
              </label>

              <label className="form-label-group full">
                Internal Onboarding Notes & Contribution Scope
                <textarea
                  name="notes"
                  placeholder="e.g. Lead vocalist on Track 002, approved by Project Lead for Phase 1 writing session..."
                  rows={2}
                  className="dark-textarea"
                />
              </label>

              <button className="submit-beat-btn" type="submit" style={{ gridColumn: "1 / -1" }}>
                + Onboard Contributor to Project 001
              </button>
            </form>
          </article>
        )}

        {/* Member Cards Grid */}
        <section className="people-grid-cards enter d3">
          {roster.length === 0 ? (
            <article className="panel empty-state" style={{ gridColumn: "1 / -1" }}>
              <h2>No contributors found</h2>
              <p>Onboard the first verified contributor to Project 001 above.</p>
            </article>
          ) : (
            roster.map((member: any) => {
              const profile = first(member.profiles);
              const rolesList =
                member.member_roles
                  ?.map((row: any) => first(row.roles)?.name)
                  .filter(Boolean) ?? [];

              const fullName = profile?.full_name || profile?.email || "Unnamed Member";
              const stageName = profile?.stage_name;
              const isPending = member.status === "pending" || member.status === "invited";
              
              const initials = fullName
                .split(" ")
                .map((p: string) => p[0])
                .filter(Boolean)
                .join("")
                .slice(0, 2)
                .toUpperCase() || "K";

              return (
                <article className="person-card" key={member.id}>
                  {/* Person Card Head */}
                  <div className="person-card-head">
                    <div className="person-avatar-ring">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={`${fullName} profile`} />
                        ) : (
                          <span>{initials}</span>
                        )}
                      <span
                        className={`person-status-indicator ${isPending ? "pending" : ""}`}
                        title={`Status: ${member.status || "active"}`}
                      />
                    </div>

                    <div className="person-identity">
                      <span className="person-full-name">{fullName}</span>
                      {stageName ? (
                        <span className="person-stage-name">AKA &ldquo;{stageName}&rdquo;</span>
                      ) : (
                        <span className="person-stage-name" style={{ opacity: 0.5 }}>Creative Member</span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Role Badges */}
                  <div className="person-roles-wrap">
                    {rolesList.length > 0 ? (
                      rolesList.map((r: string, idx: number) => (
                        <span key={idx} className={`role-chip ${getRoleClass(r)}`}>
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="role-chip">Project Member</span>
                    )}
                  </div>

                  {/* Status & Contact Footer */}
                  <div className="person-meta-footer">
                    <span className="person-email-text">
                      {profile?.email || "No email on record"}
                    </span>
                    <span className="person-joined-badge">
                      <ClockIcon size={11} />
                      {isPending
                        ? "Pending"
                        : `Joined ${new Date(member.joined_at).toLocaleDateString("en-KE", {
                            month: "short",
                            year: "numeric",
                          })}`}
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
