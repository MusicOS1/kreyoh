"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  MusicIcon,
  DiscIcon,
  MicIcon,
  CheckIcon,
  LayersIcon,
  BriefcaseIcon,
  WalletIcon,
  ActivityIcon,
  SettingsIcon,
  SearchIcon,
  BellIcon,
  PlusIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  SparklesIcon,
} from "./Icons";
import { KreyohMark, KreyohLogo } from "./Branding";
import { signOut } from "../app/actions";
import { selectProject } from "../app/projects/actions";
import { getNavigationForRoles } from "../lib/roleNavigation";
import ProfileMenu from "./ProfileMenu";
import AmbientMusicAtmosphere from "./AmbientMusicAtmosphere";
import PresenceHeartbeat from "./PresenceHeartbeat";

type ShellLayoutProps = {
  userName: string;
  primaryRole: string;
  projectCode: string;
  projectName: string;
  projectStatus?: string;
  hasProject: boolean;
  activeProjects: Array<{id:string;code?:string;name?:string}>;
  selectedProjectId?: string | null;
  roles: string[];
  userEmail?: string | null;
  stageName?: string | null;
  avatarUrl?: string | null;
  children: React.ReactNode;
};

export default function ShellLayout({
  userName,
  primaryRole,
  projectCode,
  projectName,
  projectStatus = "Production",
  hasProject,
  activeProjects,
  selectedProjectId,
  roles,
  userEmail,
  stageName,
  avatarUrl,
  children,
}: ShellLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = hasProject ? getNavigationForRoles(roles) : [
    {label:"Home",href:"/workspace",icon:HomeIcon,badge:undefined,activeMatch:(p:string)=>p==="/workspace"},
    {label:"Explore Projects",href:"/projects",icon:BriefcaseIcon,badge:undefined,activeMatch:(p:string)=>p.startsWith("/projects")},
    {label:"Invitations",href:"/invitations",icon:UsersIcon,badge:undefined,activeMatch:(p:string)=>p.startsWith("/invitations")},
    {label:"Notifications",href:"/notifications",icon:BellIcon,badge:undefined,activeMatch:(p:string)=>p.startsWith("/notifications")},
  ];

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "K";

  const renderSidebarContent = (isMobile = false) => (
    <div className="sidebar-inner">
      {/* Brand Identity with Bespoke Logo */}
      <div className="brand-header">
        <Link href="/workspace" className="brand-link" onClick={() => isMobile && setMobileOpen(false)}>
          <KreyohLogo size={32} showTagline={true} />
        </Link>

        {isMobile && (
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>

      {/* Compact project context / selector */}
      <div className="workspace-card">
        <div className="workspace-avatar">
          <span>{hasProject && projectCode ? projectCode.slice(0, 3).toUpperCase() : "FM"}</span>
        </div>
        <div className="workspace-info">
          <span className="workspace-kicker">{hasProject ? "PROJECT SPACE" : "CREATOR HOME"}</span>
          <span className="workspace-title">{projectName}</span>
        </div>
        {hasProject && <div className="workspace-status-dot" title="Active project" />}
      </div>

      {activeProjects.length > 1 && <form action={selectProject} className="sidebar-project-selector">
        <select name="project_id" defaultValue={selectedProjectId || ""} aria-label="Switch project">
          {activeProjects.map((item)=><option key={item.id} value={item.id}>{item.name || item.code}</option>)}
        </select>
        <button>Switch</button>
      </form>}

      {/* Main Navigation */}
      <nav className="nav-container" aria-label="Main Navigation">
        <div className="nav-section-label">{hasProject ? "PROJECT AREAS" : "FACKTS MUSIC"}</div>
        {visibleNavItems.map((item) => {
          const isActive = item.activeMatch(pathname);
          const IconComp = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={() => isMobile && setMobileOpen(false)}
            >
              <span className="nav-icon-wrap">
                <IconComp size={16} />
              </span>
              <span className="nav-label">{item.label}</span>

              {item.badge && (
                <span className={item.badge === "LIVE" ? "nav-badge-live" : "nav-badge-phase"}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}
          onClick={() => isMobile && setMobileOpen(false)}
        >
          <span className="nav-icon-wrap">
            <SettingsIcon size={16} />
          </span>
          <span className="nav-label">Settings</span>
        </Link>

        <div className="user-profile-tile">
          <div className="user-avatar-initials">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="user-meta">
            <span className="user-name">{userName}</span>
            <span className="user-role-badge">{primaryRole}</span>
          </div>
          
          <form action={signOut} className="user-signout-form">
            <button
              type="submit"
              className="quick-signout-btn"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOutIcon size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="kreyoh-app-shell">
      <PresenceHeartbeat projectId={selectedProjectId} />
      {/* Background Atmosphere Layer (Subtle Studio Architectural Depth) */}
      <div className="app-backdrop-atmosphere" aria-hidden="true">
        <div className="backdrop-studio-overlay" />
        <div className="backdrop-ambient-glow" />
        <AmbientMusicAtmosphere variant="shell" />
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="sidebar-desktop">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop and Aside */}
      <div
        className={`mobile-drawer-overlay ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
        {renderSidebarContent(true)}
      </aside>

      {/* Main App Canvas */}
      <div className="kreyoh-main-canvas">
        {/* Modern Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon size={18} />
            </button>

            {/* Global Search / Command Bar */}
            <div className="topbar-search">
              <SearchIcon size={14} className="search-icon" />
              <input
                type="text"
                placeholder={hasProject ? "Search beats, people, project..." : "Search FACKTS Music..."}
                readOnly
                aria-label="Search FACKTS Music"
              />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="topbar-right">
            {/* Notifications Button */}
            <Link
              href="/notifications"
              className="topbar-icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <BellIcon size={16} />
              <span className="notification-dot" />
            </Link>

            {/* Direct access to the beat intake surface */}
            {hasProject && roles.some(role => ["Super Admin", "Admin", "Project Lead", "A&R", "Producer"].includes(role)) && (
              <Link href="/beats" className="topbar-create-btn"><PlusIcon size={14} /><span>Add Beat</span></Link>
            )}

            <ProfileMenu
              userName={userName}
              stageName={stageName}
              email={userEmail}
              roles={roles}
              avatarUrl={avatarUrl}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="kreyoh-page-container">
          {children}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        <Link href="/workspace" className={pathname === "/workspace" ? "active" : ""}><HomeIcon size={19} /><span>Home</span></Link>
        {hasProject ? <><Link href="/beats" className={pathname.startsWith("/beats") ? "active" : ""}><MusicIcon size={19} /><span>Beats</span></Link><Link href="/tasks" className={pathname.startsWith("/tasks") ? "active" : ""}><CheckIcon size={19} /><span>Actions</span></Link><Link href="/studio-sessions" className={pathname.startsWith("/studio-sessions") ? "active" : ""}><MicIcon size={19} /><span>Sessions</span></Link></> : <><Link href="/projects" className={pathname.startsWith("/projects") ? "active" : ""}><BriefcaseIcon size={19}/><span>Explore</span></Link><Link href="/invitations" className={pathname.startsWith("/invitations") ? "active" : ""}><UsersIcon size={19}/><span>Invites</span></Link><Link href="/notifications" className={pathname.startsWith("/notifications") ? "active" : ""}><BellIcon size={19}/><span>Alerts</span></Link></>}
        <Link href="/settings" className={pathname.startsWith("/settings") ? "active" : ""}><SettingsIcon size={19} /><span>Profile</span></Link>
      </nav>
    </div>
  );
}

