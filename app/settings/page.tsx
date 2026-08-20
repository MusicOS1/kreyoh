import React from "react";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { updateProfile } from "./actions";
import { SettingsIcon, UserIcon, ProjectIcon, LockIcon, ArrowUpRight, SparklesIcon } from "../../components/Icons";
import { KreyohLogo, KreyohMark } from "../../components/Branding";
import ProfilePhotoUpload from "../../components/ProfilePhotoUpload";

function initialsFor(name: string) {
  return name.split(" ").map((part) => part[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "K";
}

export default async function SettingsPage() {
  const { profile, user, project, roles } = await getWorkspace();

  const displayName = profile?.stage_name || profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <AppShell>
      <div className="content">
        <div className="heading enter">
          <div>
            <span className="eyebrow">WORKSPACE / PREFERENCES</span>
            <h1>Project Settings</h1>
            <p>Manage your Project 001 participant profile, venture identity, and brand assets.</p>
          </div>

          <div className="date">
            <span>KREYOH V1.1</span>
          </div>
        </div>

        <div className="settings-grid enter d1">
          {/* Profile Card */}
          <div className="panel">
            <div className="panel-header-row">
              <div className="panel-title-group">
                <span className="eyebrow">YOUR IDENTITY</span>
                <h2>User Profile</h2>
              </div>
              <span className="phase-pill-subtle">
                <UserIcon size={13} /> Active
              </span>
            </div>

            <form action={updateProfile} className="settings-edit-form">
              <ProfilePhotoUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url}
                fallbackText={initialsFor(displayName)}
              />
              <label className="form-label-group">
                Full legal name *
                <input
                  className="dark-input"
                  name="full_name"
                  defaultValue={profile?.full_name || ""}
                  placeholder="Your full name"
                  required
                />
              </label>
              <label className="form-label-group">
                Stage / professional name
                <input
                  className="dark-input"
                  name="stage_name"
                  defaultValue={profile?.stage_name || ""}
                  placeholder="How the venture should identify you"
                />
              </label>
              <label className="form-label-group">
                Phone / WhatsApp
                <input
                  className="dark-input"
                  name="phone"
                  type="tel"
                  defaultValue={profile?.phone || ""}
                  placeholder="+254 7..."
                />
              </label>
              <div className="settings-info-item">
                <span className="settings-label">Authenticated email</span>
                <span className="settings-value">{user.email}</span>
                <span className="settings-readonly-note">Email is managed by authentication and remains read-only here.</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-label">Assigned roles in Project 001</span>
                <div className="roles-badge-group">
                  {roles.length > 0 ? roles.map((r, i) => <span key={i} className="role-chip">{r}</span>) : <span className="role-chip">Project Member</span>}
                </div>
                <span className="settings-readonly-note">Role assignment stays with project management. You cannot self-promote from this screen.</span>
              </div>
              <button type="submit" className="submit-beat-btn">Save profile</button>
            </form>
          </div>

          {/* Project Workspace Card */}
          <div className="panel">
            <div className="panel-header-row">
              <div className="panel-title-group">
                <span className="eyebrow">ACTIVE VENTURE</span>
                <h2>Project Information</h2>
              </div>
              <span className="phase-pill-subtle">
                <ProjectIcon size={13} /> {project?.code || "P001"}
              </span>
            </div>

            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-label">Project Name</span>
                <span className="settings-value">{project?.name || "Project 001"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-label">Project Code</span>
                <span className="settings-value font-mono">{project?.code || "P001"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-label">Operating Status</span>
                <span className="settings-value highlight-accent">{project?.status || "Production"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-label">Venture Description</span>
                <span className="settings-value muted">
                  {project?.description || "The founding implementation of KREYOH Music Venture Operating System."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Downloadable Brand Assets Section */}
        <div className="panel enter d2" style={{ marginTop: "16px" }}>
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span className="eyebrow">BRAND SYSTEM</span>
              <h2>KREYOH Identity Assets</h2>
            </div>
            <span className="phase-pill-subtle">
              <SparklesIcon size={12} /> Official Assets
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", padding: "12px 0 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <KreyohLogo size={36} showTagline={true} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <a
                href="/branding/kreyoh-logo.svg"
                download="kreyoh-logo.svg"
                className="secondary-button-inline"
                style={{ height: "32px", fontSize: "10px" }}
              >
                Download Logo (SVG) <ArrowUpRight size={12} />
              </a>
              <a
                href="/branding/kreyoh-mark.svg"
                download="kreyoh-mark.svg"
                className="secondary-button-inline"
                style={{ height: "32px", fontSize: "10px" }}
              >
                Download Monogram (SVG) <ArrowUpRight size={12} />
              </a>
              <a
                href="/branding/kreyoh-wordmark.svg"
                download="kreyoh-wordmark.svg"
                className="secondary-button-inline"
                style={{ height: "32px", fontSize: "10px" }}
              >
                Download Wordmark (SVG) <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Phase 2 Settings Callout */}
        <div className="panel enter d3" style={{ marginTop: "16px" }}>
          <div className="panel-header-row">
            <div className="panel-title-group">
              <span className="eyebrow">ADVANCED CONFIGURATION</span>
              <h2>Workspace Controls & Permissions</h2>
            </div>
            <span className="phase-pill-subtle">
              <LockIcon size={12} /> Phase 2
            </span>
          </div>
          <p className="muted" style={{ fontSize: "11.5px", lineHeight: "1.6", margin: "6px 0 0" }}>
            Granular role permission editors, custom workflow stage triggers, webhook notifications, NextBeat cloud integrations, and audio master backup storage settings will activate in Phase 2.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
