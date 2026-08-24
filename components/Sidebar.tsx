"use client";

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
  LogOutIcon,
} from "./Icons";
import { KreyohLogo } from "./Branding";

const items = [
  { label: "Workspace", href: "/workspace", icon: HomeIcon },
  { label: "People", href: "/people", icon: UsersIcon },
  { label: "Beats", href: "/beats", icon: MusicIcon },
  { label: "Tracks", href: "/tracks", icon: DiscIcon },
  { label: "Studio Sessions", href: "/studio-sessions", icon: MicIcon },
  { label: "Tasks", href: "/tasks", icon: CheckIcon },
  { label: "Splits", href: "/splits", icon: LayersIcon },
  { label: "Opportunities", href: "/opportunities", icon: BriefcaseIcon },
  { label: "Finance", href: "/finance", icon: WalletIcon },
  { label: "Activity", href: "/activity", icon: ActivityIcon },
];

export default function Sidebar({
  userName,
  primaryRole,
}: {
  userName: string;
  primaryRole: string;
}) {
  const pathname = usePathname();

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "K";

  return (
    <aside className="sidebar-desktop">
      <div className="sidebar-inner">
        <div className="brand-header">
          <Link href="/" className="brand-link">
            <KreyohLogo size={32} showTagline={true} />
          </Link>
        </div>

        <div className="workspace-card">
          <div className="workspace-avatar">
            <span>P01</span>
          </div>
          <div className="workspace-info">
            <span className="workspace-kicker">VENTURE WORKSPACE</span>
            <span className="workspace-title">Project 001</span>
          </div>
          <div className="workspace-status-dot" />
        </div>

        <nav className="nav-container" aria-label="Main Navigation">
          <div className="nav-section-label">OPERATING MODULES</div>
          {items.map((item) => {
            const active =
              item.href === "/workspace"
                ? pathname === "/workspace"
                : pathname.startsWith(item.href);
            const IconComp = item.icon;

            return (
              <Link
                href={item.href}
                key={item.label}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span className="nav-icon-wrap">
                  <IconComp size={16} />
                </span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/settings"
            className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}
          >
            <span className="nav-icon-wrap">
              <SettingsIcon size={16} />
            </span>
            <span className="nav-label">Settings</span>
          </Link>

          <div className="user-profile-tile">
            <div className="user-avatar-initials">
              <span>{initials}</span>
            </div>
            <div className="user-meta">
              <span className="user-name">{userName}</span>
              <span className="user-role-badge">{primaryRole}</span>
            </div>

            <form action="/auth/signout" method="post" className="user-signout-form">
              <button type="submit" className="quick-signout-btn" title="Sign Out" aria-label="Sign Out"><LogOutIcon size={14} /></button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
