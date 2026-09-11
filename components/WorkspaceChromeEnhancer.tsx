"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MenuIcon } from "./Icons";

const STORAGE_KEY = "fackts-music-workspace-menu-collapsed";

export default function WorkspaceChromeEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Local storage can be unavailable in private contexts; the toggle still works for the session.
    }
  }, []);

  useEffect(() => {
    let stopped = false;

    const resolveTarget = () => {
      if (stopped) return true;
      const shell = document.querySelector<HTMLElement>(".kreyoh-app-shell");
      const topbarLeft = document.querySelector<HTMLElement>(".kreyoh-app-shell .topbar-left");
      if (shell && topbarLeft) {
        setTarget(topbarLeft);
        return true;
      }
      setTarget(null);
      return false;
    };

    resolveTarget();
    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      stopped = true;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".kreyoh-app-shell");
    if (!shell) return;

    shell.classList.toggle("fm-workspace-collapsed", collapsed);

    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Non-essential preference only.
    }
  }, [collapsed, target]);

  if (!target) return null;

  return createPortal(
    <button
      type="button"
      className="fm-workspace-menu-toggle"
      onClick={() => setCollapsed((value) => !value)}
      aria-label={collapsed ? "Show workspace navigation" : "Hide workspace navigation"}
      aria-pressed={collapsed}
      title={collapsed ? "Show menu" : "Hide menu"}
    >
      <MenuIcon size={17} />
      <span>{collapsed ? "Show menu" : "Hide menu"}</span>
    </button>,
    target
  );
}
