import React from "react";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { removeContributor } from "./actions";
import { addRegisteredUsers, inviteExistingUser, reviewJoinRequest } from "../projects/actions";
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
  const { supabase, admin, project, membership, roles } = await getWorkspace();

  if (!project || !membership) {
    return (
      <AppShell>
        <div className="content">
          <div className="empty-state">
            <h2>No active project access</h2>
            <p>Your FACKTS Music account is not linked to an active project.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const canAddPeople = roles.some((role) => ["Super Admin", "Project Lead", "Admin"].includes(role));

  const [membersResult, directoryResult, requestsResult] = await Promise.all([
    supabase
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
      .neq("status", "removed")
      .order("joined_at", { ascending: true }),
    canAddPeople
      ? admin
          .from("profiles")
          .select("id,full_name,stage_name,creator_types,avatar_url")
          .eq("account_status", "active")
          .order("full_name")
          .limit(100)
      : Promise.resolve({ data: [] }),
    canAddPeople
      ? admin
          .from("project_join_requests")
          .select("id,status,message,created_at,profiles(full_name,stage_name,email,creator_types)")
          .eq("project_id", project.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const roster = membersResult.data ?? [];
  const memberIds = new Set(roster.filter((member:any)=>member.status==="active").map((member:any)=>first(member.profiles)?.id));
  const directory = directoryResult.data ?? [];
  const availableProfiles=(directory||[]).filter((profile:any)=>!memberIds.has(profile.id));
  const joinRequests = requestsResult.data ?? [];

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
            <div className="panel-header-row"><div className="panel-title-group"><span className="eyebrow">REGISTERED CREATORS</span><h2>Add existing users</h2><p>Choose people already inside FACKTS Music. Only collaboration details are shown.</p></div></div>
            <form action={addRegisteredUsers} className="existing-user-picker"><label>Project role<select name="role_name" defaultValue="Artist">{AVAILABLE_ROLES.filter(role=>role!=="Admin").map(role=><option key={role}>{role}</option>)}</select></label><div className="existing-user-picker-grid">{availableProfiles.length===0?<p>Everyone in the directory is already in this project.</p>:availableProfiles.map((profile:any)=><label key={profile.id}><input type="checkbox" name="user_ids" value={profile.id}/><span><strong>{profile.stage_name||profile.full_name||"Creator"}</strong><small>{(profile.creator_types||[]).join(" · ")||"Creator"}</small></span></label>)}</div><button type="submit" className="submit-beat-btn">Add selected users to project</button></form>
          </article>
        )}

        {canAddPeople && (
          <article className="panel register-beat-panel enter d2">
            <div className="panel-header-row">
              <div className="panel-title-group">
                <span className="eyebrow">ONBOARDING WORKFLOW</span>
                <h2>Invite someone new by email</h2>
              </div>
              <span className="phase-pill-subtle">
                <PlusIcon size={12} /> Lead Action
              </span>
            </div>

            <form action={inviteExistingUser} className="beat-registration-form">
              <label className="form-label-group">
                FACKTS Music account email *
                <input
                  name="email"
                  type="email"
                  placeholder="contributor@example.com"
                  required
                  className="dark-input"
                />
                <span className="settings-readonly-note">Every contributor receives a Project 001 invitation. Access starts only after they accept it.</span>
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

              <label className="form-label-group full">
                Invitation note
                <textarea
                  name="notes"
                  placeholder="e.g. Lead vocalist on Track 002, approved by Project Lead for Phase 1 writing session..."
                  rows={2}
                  className="dark-textarea"
                />
              </label>

              <button className="submit-beat-btn" type="submit" style={{ gridColumn: "1 / -1" }}>
                + Invite Contributor to Project 001
              </button>
            </form>
          </article>
        )}

        {canAddPeople && <article className="panel join-review-panel enter d2"><div className="panel-header-row"><div className="panel-title-group"><span className="eyebrow">ACCESS REQUESTS</span><h2>Creators asking to join</h2></div><span className="phase-pill-subtle">{joinRequests?.length || 0} pending</span></div>{!joinRequests?.length?<div className="empty-state"><p>No pending requests for this project.</p></div>:<div className="join-review-list">{joinRequests.map((request:any)=>{const profile=first(request.profiles);return <div className="join-review-row" key={request.id}><div><strong>{profile?.stage_name||profile?.full_name||profile?.email}</strong><span>{request.message||"No message supplied."}</span></div><form action={reviewJoinRequest}><input type="hidden" name="request_id" value={request.id}/><select name="role_name" defaultValue="Artist"><option>Artist</option><option>Producer</option><option>Engineer</option><option>A&R</option></select><button name="decision" value="approved">Approve</button><button name="decision" value="declined" className="member-remove-button">Decline</button></form></div>})}</div>}</article>}

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
                  {canAddPeople && member.status !== "removed" && (
                    <form action={removeContributor} className="member-remove-form">
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" className="member-remove-button">Remove from project</button>
                    </form>
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

