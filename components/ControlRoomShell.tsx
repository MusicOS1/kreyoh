"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FacktsMusicLogo } from "./Branding";
import InstallControlRoomButton from "./InstallControlRoomButton";
import PresenceHeartbeat from "./PresenceHeartbeat";
import AppExperienceEnhancer from "./AppExperienceEnhancer";
import type { ControlRoomPermission } from "../lib/controlRoom";

const navigation = [
  { label: "Overview", href: "/admin", group: "Command", permission: "overview" },
  { label: "People & access", href: "/admin/users", group: "Management", permission: "people" },
  { label: "Projects", href: "/admin/projects", group: "Management", permission: "projects" },
  { label: "Music operations", href: "/admin/operations", group: "Operations", permission: "music" },
  { label: "Enquiries", href: "/admin/enquiries", group: "Operations", permission: "enquiries" },
  { label: "Suggestions", href: "/admin/suggestions", group: "Operations", permission: "projects" },
  { label: "Voting intelligence", href: "/admin/voting", group: "Intelligence", permission: "intelligence" },
  { label: "Activity", href: "/admin/activity", group: "Intelligence", permission: "intelligence" },
  { label: "Analytics", href: "/admin/analytics", group: "Intelligence", permission: "intelligence" },
  { label: "System settings", href: "/admin/system", group: "Platform", permission: "system" },
];

export default function ControlRoomShell({
  email,
  permissions = ["all"],
  children,
}: {
  email?: string;
  permissions?: ControlRoomPermission[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTarget = pathname.startsWith("/admin/operations") ? "/admin/operations" : "/admin/users";
  const searchPlaceholder = pathname.startsWith("/admin/operations") ? "Search beats and tracks" : "Search people and accounts";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const can = (permission: string) =>
    permission === "overview" ||
    permissions.includes("all") ||
    permissions.includes(permission as ControlRoomPermission);

  const sidebar = (
    <>
      <div className="control-sidebar-head">
        <span>CONTROL CENTRE</span>
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close Control Room menu">×</button>
      </div>
      {["Command", "Management", "Operations", "Intelligence", "Platform"].map((group) => (
        <div className="control-nav-group" key={group}>
          <span className="control-nav-label">{group}</span>
          {navigation
            .filter((item) => item.group === group && can(item.permission))
            .map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : ""}>
                {item.label}
              </Link>
            ))}
        </div>
      ))}
      <Link href="/workspace" className="control-open-platform">Open FACKTS Music ↗</Link>
      <div className="control-sidebar-note">
        <span>PRIVATE</span>
        <p>Server-authorised management access for the whole music system.</p>
      </div>
      <form action="/auth/signout?next=/admin/login" method="post" className="control-sidebar-logout">
        <button type="submit">Sign out</button>
      </form>
    </>
  );

  return (
    <main className="control-room">
      <AppExperienceEnhancer />
      <PresenceHeartbeat />
      <header className="control-topbar">
        <div className="control-brand"><FacktsMusicLogo size={42}/><span>CONTROL ROOM</span></div>
        <form className="control-top-search" action={searchTarget} method="get">
          <input type="search" name="q" defaultValue={searchParams.get("q") || ""} placeholder={searchPlaceholder} aria-label={searchPlaceholder}/>
          <button type="submit">Search</button>
        </form>
        <button type="button" className="control-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Open Control Room menu"><span/><span/><span/></button>
        <div className="control-top-actions">
          <InstallControlRoomButton/>
          <span className="control-admin-identity">{email}</span>
          <form action="/auth/signout?next=/admin/login" method="post"><button type="submit" className="control-logout">Sign out</button></form>
        </div>
      </header>

      <div className={`control-nav-backdrop ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)}/>
      <div className="control-shell">
        <aside className={`control-sidebar ${mobileOpen ? "open" : ""}`}>{sidebar}</aside>
        <div className="control-content">{children}</div>
      </div>

      <nav className="control-mobile-bottom-nav" aria-label="Control Room primary navigation">
        <Link className={isActive("/admin") ? "active" : ""} href="/admin">Overview</Link>
        {can("people") && <Link className={isActive("/admin/users") ? "active" : ""} href="/admin/users">People</Link>}
        {can("music") && <Link className={isActive("/admin/operations") ? "active" : ""} href="/admin/operations">Operations</Link>}
        <button type="button" onClick={() => setMobileOpen(true)}>More</button>
      </nav>
    </main>
  );
}
