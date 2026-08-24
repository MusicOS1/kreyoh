"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ChevronDown,
  DownloadIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
} from "./Icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ProfileMenuProps = {
  userName: string;
  stageName?: string | null;
  email?: string | null;
  roles: string[];
  avatarUrl?: string | null;
  canAccessControlRoom?: boolean;
};

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "K"
  );
}

type ThemePreference = "light" | "dark" | "system";

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("kreyoh-theme", theme);
}

export default function ProfileMenu({
  userName,
  stageName,
  email,
  roles,
  avatarUrl,
  canAccessControlRoom = false,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = initialsFor(userName);

  useEffect(() => {
    const saved = window.localStorage.getItem("kreyoh-theme");
    const nextTheme: ThemePreference = saved === "dark" || saved === "system" || saved === "light" ? saved : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleThemeChange = (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="profile-menu-root" ref={rootRef}>
      <button
        type="button"
        className={`topbar-user-pill ${open ? "open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setNotificationsOpen(false);
        }}
      >
        <span className="topbar-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </span>
        <span className="topbar-user-info">
          <span className="topbar-user-name">{userName}</span>
          <span className="topbar-user-role">{roles[0] || "Project Member"}</span>
        </span>
        <ChevronDown size={14} className="profile-chevron" />
      </button>

      {open && (
        <div className="profile-popover" role="menu" aria-label="User profile menu">
          <div className="profile-popover-head">
            <span className="profile-popover-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            </span>
            <span className="profile-popover-identity">
              <strong>{stageName || userName}</strong>
              <small>{email || "Authenticated FACKTS Music user"}</small>
              <span className="profile-role-list">
                {roles.length ? roles.join(" · ") : "Project Member"}
              </span>
            </span>
            <button
              type="button"
              className="profile-popover-close"
              onClick={() => setOpen(false)}
              aria-label="Close profile menu"
            >
              <XIcon size={14} />
            </button>
          </div>

          <div className="profile-menu-section">
            {canAccessControlRoom && (
              <Link href="/admin" className="profile-menu-link" role="menuitem" onClick={() => setOpen(false)}>
                <SettingsIcon size={15} />
                <span><strong>Open Control Room</strong><small>Private FACKTS Music management</small></span>
              </Link>
            )}
            <Link href="/settings" className="profile-menu-link" role="menuitem" onClick={() => setOpen(false)}>
              <UserIcon size={15} />
              <span><strong>View / Edit Profile</strong><small>Personal identity and contact details</small></span>
            </Link>
            <button
              type="button"
              className="profile-menu-link"
              role="menuitem"
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <BellIcon size={15} />
              <span><strong>Notifications</strong><small>Recent activity and attention items</small></span>
              <span className="profile-menu-count">0</span>
            </button>
            {notificationsOpen && (
              <div className="profile-notification-panel">
                <strong>Nothing new right now</strong>
                <span>FACKTS Music will surface project activity here.</span>
                <Link href="/activity" onClick={() => setOpen(false)}>Open activity ledger →</Link>
              </div>
            )}
          </div>

          <div className="profile-menu-section profile-menu-preferences">
            <div className="profile-menu-preference-row">
              <span className="profile-menu-preference-label"><MoonIcon size={15} /> Appearance</span>
              <select
                value={theme}
                onChange={(event) => handleThemeChange(event.target.value as ThemePreference)}
                aria-label="Appearance preference"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            {!installed && installEvent && (
              <button
                type="button"
                className="profile-menu-link profile-menu-install"
                role="menuitem"
                onClick={handleInstall}
                title="Install FACKTS Music"
              >
                <DownloadIcon size={15} />
                <span><strong>Install FACKTS Music</strong><small>Add FACKTS Music to this device</small></span>
              </button>
            )}
            <Link href="/settings" className="profile-menu-link" role="menuitem" onClick={() => setOpen(false)}>
              <SettingsIcon size={15} />
              <span><strong>Workspace Settings</strong><small>Project and brand preferences</small></span>
            </Link>
          </div>

          <div className="profile-menu-footer">
            <form action="/auth/signout" method="post">
              <button type="submit" className="profile-menu-signout"><LogOutIcon size={15} /> Sign out of FACKTS Music</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

