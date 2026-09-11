"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type PlayerState = {
  kind: "iframe" | "video";
  src: string;
  title: string;
  sourceUrl: string;
} | null;

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  if (!host.includes("youtube.com")) return "";
  const queryId = url.searchParams.get("v");
  if (queryId) return queryId;
  const parts = url.pathname.split("/").filter(Boolean);
  if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  return "";
}

function resolveVideo(rawHref: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const url = new URL(rawHref, window.location.href);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const yt = youtubeId(url);

    if (yt) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      };
    }

    if (host.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1` };
    }

    if (host === "loom.com" || host.endsWith(".loom.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const shareIndex = parts.indexOf("share");
      const id = shareIndex >= 0 ? parts[shareIndex + 1] : "";
      if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${encodeURIComponent(id)}?autoplay=1` };
    }

    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.href)) {
      return { kind: "video", src: url.href };
    }
  } catch {
    return null;
  }

  return null;
}

function titleFromAnchor(anchor: HTMLAnchorElement) {
  const explicit = anchor.dataset.videoTitle?.trim();
  if (explicit) return explicit;
  const heading = anchor.querySelector("h1,h2,h3,h4,strong");
  const headingText = heading?.textContent?.trim();
  if (headingText) return headingText;
  const label = anchor.getAttribute("aria-label")?.trim();
  if (label) return label;
  const text = anchor.textContent?.replace(/\s+/g, " ").trim();
  return text && text.length <= 120 ? text : "FACKTS Music video";
}

function findInlineTarget(anchor: HTMLAnchorElement) {
  return (
    anchor.closest<HTMLElement>(
      "[data-video-inline-target], .fm-v3-watch-card, .creator-interview, .creator-song-player, .panel, article"
    ) || anchor
  );
}

export default function GlobalVideoPlayer() {
  const [player, setPlayer] = useState<PlayerState>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  const closePlayer = () => {
    setPlayer(null);
    setMount((current) => {
      current?.remove();
      return null;
    });
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.dataset.videoExternal === "true") return;

      const resolved = resolveVideo(anchor.href);
      if (!resolved) return;

      event.preventDefault();

      mount?.remove();
      const inlineMount = document.createElement("div");
      inlineMount.className = "fm-inline-video-mount";
      const placementTarget = findInlineTarget(anchor);
      placementTarget.insertAdjacentElement("afterend", inlineMount);

      setMount(inlineMount);
      setPlayer({
        ...resolved,
        title: titleFromAnchor(anchor),
        sourceUrl: anchor.href,
      });

      window.setTimeout(() => {
        inlineMount.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && player) closePlayer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    return () => mount?.remove();
  }, [mount]);

  const sourceLabel = useMemo(() => {
    if (!player) return "";
    try {
      return new URL(player.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "original source";
    }
  }, [player]);

  if (!player || !mount) return null;

  return createPortal(
    <section className="fm-inline-video-panel" aria-label={player.title}>
      <div className="fm-inline-video-topbar">
        <div>
          <span>WATCHING INSIDE FACKTS MUSIC</span>
          <strong>{player.title}</strong>
        </div>
        <button type="button" className="fm-inline-video-close" onClick={closePlayer} aria-label="Close video">×</button>
      </div>

      <div className="fm-inline-video-stage">
        {player.kind === "iframe" ? (
          <iframe
            src={player.src}
            title={player.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video src={player.src} controls autoPlay playsInline />
        )}
      </div>

      <div className="fm-inline-video-footer">
        <span>Playing inside the FACKTS Music page</span>
        <a href={player.sourceUrl} target="_blank" rel="noreferrer" data-video-external="true">
          Open on {sourceLabel} ↗
        </a>
      </div>
    </section>,
    mount
  );
}
