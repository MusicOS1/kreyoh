"use client";

import GlobalHeader from './ecosystem/GlobalHeader';
import type {HeaderIdentity} from '../lib/workspaceExperience';
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FacktsMusicLogo } from "./Branding";
import InstallControlRoomButton from "./InstallControlRoomButton";
import PresenceHeartbeat from "./PresenceHeartbeat";
import AppExperienceEnhancer from "./AppExperienceEnhancer";
import type { ControlRoomPermission } from "../lib/controlRoom";

const navigation = [
  { label: "Hero Studio & discovery", href: "/admin/discovery", group: "Operations", permission: "music" },
  { label: "Public releases", href: "/admin/releases", group: "Operations", permission: "music" },
  { label: "Bulk song importer", href: "/admin/releases/bulk", group: "Operations", permission: "music" },
  { label: "Overview", href: "/admin", group: "Command", permission: "overview" },
  { label: "People & access", href: "/admin/users", group: "Management", permission: "people" },
  { label: "Platform administrators", href: "/admin/users#admin-access", group: "Management", permission: "people" },
  { label: "Professional applications", href: "/admin/professional-applications", group: "Management", permission: "people" },
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
  identity,
  permissions = ["all"],
  children,
}: {
  email?: string;
  identity?: HeaderIdentity;
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
    <div className="control-room">
      <AppExperienceEnhancer />
      <PresenceHeartbeat />
      <GlobalHeader identity={identity} active="admin" onMenu={()=>setMobileOpen(true)}/>
      <form className="control-context-search" action={searchTarget} method="get"><label>{searchPlaceholder}<input type="search" name="q" defaultValue={searchParams.get("q")||""} placeholder={searchPlaceholder}/></label><button type="submit">Search</button></form>

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
    </div>
  );
}
