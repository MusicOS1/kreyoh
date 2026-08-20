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
import { getNavigationForRoles } from "../lib/roleNavigation";
import ProfileMenu from "./ProfileMenu";
import PwaRegister from "./PwaRegister";

type ShellLayoutProps = {
  userName: string;
  primaryRole: string;
  projectCode: string;
  projectName: string;
  projectStatus?: string;
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
  roles,
  userEmail,
  stageName,
  avatarUrl,
  children,
}: ShellLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = getNavigationForRoles(roles);

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
        <Link href="/" className="brand-link" onClick={() => isMobile && setMobileOpen(false)}>
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

      {/* Project 001 Workspace Card */}
      <div className="workspace-card">
        <div className="workspace-avatar">
          <span>{projectCode ? projectCode.slice(0, 3).toUpperCase() : "P01"}</span>
        </div>
        <div className="workspace-info">
          <span className="workspace-kicker">PROJECT SPACE</span>
          <span className="workspace-title">{projectName || "Project 001"}</span>
        </div>
        <div className="workspace-status-dot" title="Project 001 is active" />
      </div>

      {/* Main Navigation */}
      <nav className="nav-container" aria-label="Main Navigation">
        <div className="nav-section-label">PROJECT AREAS</div>
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
      {/* Background Atmosphere Layer (Subtle Studio Architectural Depth) */}
      <div className="app-backdrop-atmosphere" aria-hidden="true">
        <div className="backdrop-studio-overlay" />
        <div className="backdrop-ambient-glow" />
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
                placeholder="Search beats, people, project..."
                readOnly
                aria-label="Search KREYOH"
              />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
          </div>

          <div className="topbar-right">
            {/* Project context */}
            <div className="momentum-pill">
              <span className="momentum-pulse" />
              <span className="momentum-text">{projectName} · {projectStatus}</span>
            </div>

            {/* Notifications Button */}
            <button
              type="button"
              className="topbar-icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <BellIcon size={16} />
              <span className="notification-dot" />
            </button>

            {/* Direct access to the beat intake surface */}
            <Link href="/beats" className="topbar-create-btn">
              <PlusIcon size={14} />
              <span>Add Beat</span>
            </Link>

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
      <PwaRegister />
    </div>
  );
}
