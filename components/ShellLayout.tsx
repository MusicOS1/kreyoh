"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  canAccessControlRoom?: boolean;
  unreadNotifications?: number;
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
  canAccessControlRoom = false,
  unreadNotifications = 0,
  children,
}: ShellLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTarget = pathname.startsWith("/beats") ? "/beats" : pathname.startsWith("/tracks") ? "/tracks" : pathname.startsWith("/people") ? "/people" : "/discover";
  const searchPlaceholder = pathname.startsWith("/beats") ? "Search beats, codes or producers" : pathname.startsWith("/tracks") ? "Search tracks or codes" : pathname.startsWith("/people") ? "Search people, stage names or roles" : "Search creators across FACKTS Music";
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = hasProject ? getNavigationForRoles(roles) : [];
  const platformNavItems = [
    {label:"Home",href:"/home",icon:HomeIcon,activeMatch:(p:string)=>p==="/home"},
    {label:"My Projects",href:"/projects",icon:BriefcaseIcon,activeMatch:(p:string)=>p.startsWith("/projects")||p.startsWith("/invitations")},
    {label:"Discover",href:"/discover",icon:UsersIcon,activeMatch:(p:string)=>p.startsWith("/discover")},
    {label:"Notifications",href:"/notifications",icon:BellIcon,activeMatch:(p:string)=>p.startsWith("/notifications")},
    {label:"Suggest Something",href:"/suggestions",icon:SparklesIcon,activeMatch:(p:string)=>p.startsWith("/suggestions")},
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
        <Link href="/home" className="brand-link" onClick={() => isMobile && setMobileOpen(false)}>
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

      {activeProjects.length > 0 && <form action={selectProject} className="sidebar-project-selector">
        <select name="project_id" defaultValue={selectedProjectId || ""} aria-label="Switch project">
          {activeProjects.map((item)=><option key={item.id} value={item.id}>{item.name || item.code}</option>)}
        </select>
        <button>Switch</button>
      </form>}
      <Link href="/projects#start-project" className="sidebar-create-project">+ Create Project</Link>

      {/* Main Navigation */}
      <nav className="nav-container" aria-label="Main Navigation">
        <div className="nav-section-label">FACKTS MUSIC</div>
        {platformNavItems.map((item) => { const IconComp=item.icon; const isActive=item.activeMatch(pathname); return <Link key={item.label} href={item.href} className={`nav-link ${isActive?"active":""}`} onClick={()=>isMobile&&setMobileOpen(false)}><span className="nav-icon-wrap"><IconComp size={16}/></span><span className="nav-label">{item.label}</span>{item.label==="Notifications"&&unreadNotifications>0&&<span className="nav-unread-count">{Math.min(unreadNotifications,99)}</span>}</Link>; })}
        {hasProject && <div className="nav-section-label project-nav-label">PROJECT AREAS</div>}
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
        {canAccessControlRoom && <Link href="/admin" className="nav-link control-room-switch" onClick={() => isMobile && setMobileOpen(false)}><span className="nav-icon-wrap"><BriefcaseIcon size={16} /></span><span className="nav-label">Open Control Room</span><span className="nav-badge-live">ADMIN</span></Link>}
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
          
          <form action="/auth/signout" method="post" className="user-signout-form">
            <button type="submit" className="quick-signout-btn" title="Sign Out" aria-label="Sign Out">
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
            <form className="topbar-search" action={searchTarget} method="get">
              <SearchIcon size={14} className="search-icon" />
              <input type="search" name="q" defaultValue={searchParams.get("q") || ""} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
              <button type="submit" className="topbar-search-submit">Search</button>
            </form>
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
              {unreadNotifications > 0 && <span className="notification-count">{Math.min(unreadNotifications,99)}</span>}
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
              canAccessControlRoom={canAccessControlRoom}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="kreyoh-page-container">
          {children}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        <Link href="/home" className={pathname === "/home" ? "active" : ""}><HomeIcon size={19} /><span>Home</span></Link>
        <Link href="/projects" className={pathname.startsWith("/projects")||pathname.startsWith("/invitations") ? "active" : ""}><BriefcaseIcon size={19}/><span>Projects</span></Link>
        <Link href="/discover" className={pathname.startsWith("/discover") ? "active" : ""}><UsersIcon size={19}/><span>Discover</span></Link>
        <Link href="/notifications" className={pathname.startsWith("/notifications") ? "active" : ""}><BellIcon size={19}/><span>Alerts{unreadNotifications>0?` ${Math.min(unreadNotifications,99)}`:""}</span></Link>
        <Link href="/settings" className={pathname.startsWith("/settings") ? "active" : ""}><SettingsIcon size={19} /><span>Profile</span></Link>
      </nav>
    </div>
  );
}

