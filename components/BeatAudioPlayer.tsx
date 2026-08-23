"use client";

import { useRef } from "react";

export default function BeatAudioPlayer({ beatId, src }: { beatId: string; src: string }) {
  const sent = useRef(false);
  function recordPlay() {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_name: "beat_played", entity_type: "beat", entity_id: beatId }) });
  }
  return <audio className="fackts-audio-player" controls preload="metadata" src={src} onPlay={recordPlay}>Your browser cannot play this audio.</audio>;
}
