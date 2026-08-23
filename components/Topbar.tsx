"use client";

import Link from "next/link";
import { signOut } from "../app/actions";
import { SearchIcon, BellIcon, PlusIcon } from "./Icons";

export default function Topbar({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "K";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-search">
          <SearchIcon size={15} className="search-icon" />
          <input
            placeholder="Search beats, contributors, pipeline..."
            readOnly
            aria-label="Search FACKTS Music"
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>

      <div className="topbar-right">
        <div className="momentum-pill">
          <span className="momentum-pulse" />
          <span className="momentum-text">Project 001 · Production</span>
        </div>

        <button
          className="topbar-icon-button"
          type="button"
          aria-label="Notifications"
          title="Notifications"
        >
          <BellIcon size={17} />
          <span className="notification-dot" />
        </button>

        <Link href="/beats" className="topbar-create-btn">
          <PlusIcon size={15} />
          <span>New Beat</span>
        </Link>

        <div className="topbar-user-pill">
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">{userName}</span>
            <span className="topbar-user-role">{role}</span>
          </div>
        </div>

        <form action={signOut} className="topbar-signout-form">
          <button
            className="topbar-logout-btn"
            type="submit"
            title="Sign out of FACKTS Music"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
