"use client";

import { useEffect } from "react";

type Kind = "render_error" | "runtime_error" | "unhandled_rejection";
const allowed = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError", "Error", "ChunkLoadError", "NetworkError"]);
const sentAt = new Map<string, number>();

export function reportClientDiagnostic(kind: Kind, name?: string) {
  if (typeof window === "undefined") return;
  const reason = allowed.has(name || "") ? name : "Unknown";
  const route = window.location.pathname;
  const key = kind + ":" + reason + ":" + route;
  const now = Date.now();
  if (now - (sentAt.get(key) || 0) < 30000 || sentAt.size > 50) return;
  sentAt.set(key, now);
  // Best effort only: diagnostic collection must never interrupt the user.
  void fetch("/api/diagnostics", {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "same-origin", keepalive: true,
    body: JSON.stringify({ kind, reason, route }),
  }).catch(() => {});
}

export default function ClientDiagnosticReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (!(event instanceof ErrorEvent)) return;
      reportClientDiagnostic("runtime_error", event.error?.name);
    };
    const onReject = (event: PromiseRejectionEvent) => {
      reportClientDiagnostic("unhandled_rejection", event.reason?.name);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  return null;
}
