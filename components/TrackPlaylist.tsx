"use client";

import { useRef, useState, useTransition } from "react";
import { recordTrackVersionListen, setTrackVersionRanking } from "../app/tracks/actions";

export type PlaylistTrack = {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  artwork?: string;
  ranking?: number;
  listened: boolean;
  eligible: boolean;
  finalScore?: number;
  communityScore?: number;
  arScore?: number;
  firstPlaceVotes?: number;
};

export default function TrackPlaylist({ tracks, resultsVisible = false, showDetailedStats = false }: { tracks: PlaylistTrack[]; resultsVisible?: boolean; showDetailedStats?: boolean }) {
  const [current, setCurrent] = useState(0);
  const [localTracks, setLocalTracks] = useState(tracks);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement>(null);
  const listenRecorded = useRef(new Set(tracks.filter((track) => track.listened).map((track) => track.id)));

  if (!localTracks.length) return <div className="track-chart-empty">Add an audio version to a track and it will enter the listening room.</div>;
  const selected = localTracks[Math.min(current, localTracks.length - 1)];

  function choose(index: number) {
    setCurrent(index);
    setNotice("");
    setTimeout(() => audioRef.current?.play().catch(() => undefined), 0);
  }

  function captureListen() {
    const player = audioRef.current;
    if (!player?.duration || listenRecorded.current.has(selected.id)) return;
    const percent = Math.round((player.currentTime / player.duration) * 100);
    if (percent < 60) return;
    listenRecorded.current.add(selected.id);
    setLocalTracks((items) => items.map((item) => item.id === selected.id ? { ...item, listened: true } : item));
    const isEligible = selected.eligible;
    startTransition(async () => {
      try {
        await recordTrackVersionListen(selected.id, percent);
        setNotice(isEligible ? "Ranking unlocked. Choose #1, #2 or #3." : "Listening complete. You are credited on this track, so it cannot be included in your own ballot.");
      }
      catch (cause) {
        listenRecorded.current.delete(selected.id);
        setLocalTracks((items) => items.map((item) => item.id === selected.id ? { ...item, listened: false } : item));
        setNotice(cause instanceof Error ? cause.message : "Listening progress could not be saved.");
      }
    });
  }

  function rankTrack(trackId: string, rank: number) {
    setNotice("");
    startTransition(async () => {
      try {
        await setTrackVersionRanking(trackId, rank);
        setLocalTracks((items) => items.map((item) => ({
          ...item,
          ranking: item.id === trackId ? rank : item.ranking === rank ? undefined : item.ranking,
        })));
        setNotice(`Your #${rank} selection is recorded.`);
      } catch (cause) {
        setNotice(cause instanceof Error ? cause.message : "Your selection could not be recorded.");
      }
    });
  }

  return <section className="track-chart-room spotify-room">
    <div className="track-chart-player">
      <div className={selected.artwork ? "track-player-art has-artwork" : "track-player-art"}>
        {selected.artwork ? <img src={selected.artwork} alt={`${selected.title} artwork`} /> : <span aria-hidden="true">♫</span>}
      </div>
      <div className="track-player-copy"><span>NOW PLAYING</span><h3>{selected.title}</h3><p>{selected.subtitle}</p></div>
      <audio ref={audioRef} key={selected.src} src={selected.src} controls preload="metadata" onTimeUpdate={captureListen} onEnded={() => setCurrent((current + 1) % localTracks.length)} />
      <small className="track-listen-rule">Listen to 60% to unlock ranking. Contributors cannot rank their own track.</small>
      {notice && <div className="track-ballot-notice" role="status">{notice}</div>}
    </div>
    <div className="track-chart-list">
      <header><span>#</span><span>Track</span><span>Your Top 3</span></header>
      {localTracks.map((track,index)=><article className={index===current?"is-current":""} key={track.id}>
        <button type="button" className="track-chart-select" onClick={()=>choose(index)}>
          <b>{resultsVisible ? String(index+1).padStart(2,"0") : "▶"}</b>
          <span className={track.artwork ? "track-row-art has-artwork" : "track-row-art"}>{track.artwork ? <img src={track.artwork} alt="" /> : "♫"}</span>
          <span><strong>{track.title}</strong><small>{track.subtitle}</small></span>
        </button>
        <div className={`track-rank-buttons ${track.eligible && track.listened ? "is-unlocked" : "is-locked"}`} aria-label={`Rank ${track.title}`}>
          {[1,2,3].map((rank)=><button type="button" key={rank} className={track.ranking===rank?"selected":track.eligible&&track.listened?"available":""} disabled={pending || !track.eligible || !track.listened} onClick={()=>rankTrack(track.id,rank)} title={!track.eligible?"You are credited on this track":!track.listened?"Listen to 60% first":`Rank #${rank}`}>{rank}</button>)}
          <small className="track-rank-state">{!track.eligible ? "CREDITED · CANNOT RANK" : track.listened ? "RANKING UNLOCKED" : "LISTEN 60% TO UNLOCK"}</small>
        </div>
        {resultsVisible && <div className="track-result-score"><strong>{Math.round(track.finalScore || 0)}</strong><small>final</small>{showDetailedStats && <span>{Math.round(track.communityScore || 0)} community · {Math.round(track.arScore || 0)} A&amp;R · {track.firstPlaceVotes || 0} firsts</span>}</div>}
      </article>)}
    </div>
  </section>;
}
