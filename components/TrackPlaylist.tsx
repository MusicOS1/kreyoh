"use client";

import {useEffect,useRef,useState,useTransition} from "react";
import {recordTrackVersionListen,setTrackVersionRanking} from "../app/tracks/actions";

export type PlaylistTrack={id:string;title:string;subtitle:string;src:string;artwork?:string;ranking?:number;listened:boolean;eligible:boolean;finalScore?:number;communityScore?:number;arScore?:number;firstPlaceVotes?:number;};

export default function TrackPlaylist({tracks,resultsVisible=false,showDetailedStats=false}:{tracks:PlaylistTrack[];resultsVisible?:boolean;showDetailedStats?:boolean}){
 const[current,setCurrent]=useState(0),[localTracks,setLocalTracks]=useState(tracks),[notice,setNotice]=useState(""),[isPlaying,setIsPlaying]=useState(false),[pending,startTransition]=useTransition();
 const audioRef=useRef<HTMLAudioElement>(null),autoPlayRef=useRef(false),listenRecorded=useRef(new Set(tracks.filter(t=>t.listened).map(t=>t.id)));

 useEffect(()=>{setLocalTracks(tracks);setCurrent(i=>Math.min(i,Math.max(0,tracks.length-1)));},[tracks]);
 const selected=localTracks[Math.min(current,Math.max(0,localTracks.length-1))];

 useEffect(()=>{const p=audioRef.current;if(!p)return;if(autoPlayRef.current){autoPlayRef.current=false;p.play().catch(()=>setIsPlaying(false));}},[current,selected?.src]);

 if(!localTracks.length)return <div className="track-chart-empty">Add an audio version to a track and it will enter the listening room.</div>;

 function selectTrack(index:number,autoplay=true){autoPlayRef.current=autoplay;setNotice("");setCurrent(Math.max(0,Math.min(index,localTracks.length-1)));}
 function previousTrack(){selectTrack(current<=0?localTracks.length-1:current-1,true);}
 function nextTrack(){selectTrack(current>=localTracks.length-1?0:current+1,true);}
 function togglePlayback(){const p=audioRef.current;if(!p)return;p.paused?p.play().catch(()=>setIsPlaying(false)):p.pause();}

 function captureListen(){
  const p=audioRef.current;if(!p?.duration||listenRecorded.current.has(selected.id))return;
  const percent=Math.round((p.currentTime/p.duration)*100);if(percent<60)return;
  listenRecorded.current.add(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:true}:item));
  const eligible=selected.eligible;
  startTransition(async()=>{try{const result=await recordTrackVersionListen(selected.id,percent);if(!result.ok)throw new Error(result.error);setNotice(eligible?"Ranking unlocked. Choose #1, #2 or #3.":"Listening complete. You are credited on this track, so it cannot be included in your own ballot.");}catch(cause){listenRecorded.current.delete(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:false}:item));setNotice(cause instanceof Error?cause.message:"Listening progress could not be saved.");}});
 }

 function rankTrack(trackId:string,rank:number){setNotice("");startTransition(async()=>{try{const result=await setTrackVersionRanking(trackId,rank);if(!result.ok)throw new Error(result.error);setLocalTracks(items=>items.map(item=>({...item,ranking:item.id===trackId?rank:item.ranking===rank?undefined:item.ranking})));setNotice(`Your #${rank} selection is recorded.`);}catch(cause){setNotice(cause instanceof Error?cause.message:"Your selection could not be recorded.");}});}

 return <section className="track-chart-room spotify-room"><style>{`
 .track-playlist-transport{display:flex;align-items:center;justify-content:center;gap:9px;margin:10px 0 4px}
 .track-playlist-transport button{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;font-weight:900}
 .track-playlist-transport .main{width:50px;height:50px;background:#f97316;color:#120a05;border-color:rgba(249,115,22,.4)}
 `}</style>
  <div className="track-chart-player">
   <div className={selected.artwork?"track-player-art has-artwork":"track-player-art"}>{selected.artwork?<img src={selected.artwork} alt={`${selected.title} artwork`}/>:<span aria-hidden="true">♫</span>}</div>
   <div className="track-player-copy"><span>NOW PLAYING</span><h3>{selected.title}</h3><p>{selected.subtitle}</p></div>
   <audio ref={audioRef} key={selected.src} src={selected.src} controls preload="metadata" onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)} onTimeUpdate={captureListen} onEnded={nextTrack}/>
   <div className="track-playlist-transport" aria-label="Playlist controls"><button type="button" onClick={previousTrack} aria-label="Previous track">◀◀</button><button type="button" className="main" onClick={togglePlayback} aria-label={isPlaying?"Pause":"Play"}>{isPlaying?"Ⅱ":"▶"}</button><button type="button" onClick={nextTrack} aria-label="Next track">▶▶</button></div>
   <small className="track-listen-rule">Listen to 60% to unlock ranking. Contributors cannot rank their own track.</small>
   {notice&&<div className="track-ballot-notice" role="status">{notice}</div>}
  </div>
  <div className="track-chart-list"><header><span>#</span><span>Track</span><span>Your Top 3</span></header>
   {localTracks.map((track,index)=><article className={index===current?"is-current":""} key={track.id}>
    <button type="button" className="track-chart-select" onClick={()=>selectTrack(index,true)}><b>{resultsVisible?String(index+1).padStart(2,"0"):index===current&&isPlaying?"Ⅱ":"▶"}</b><span className={track.artwork?"track-row-art has-artwork":"track-row-art"}>{track.artwork?<img src={track.artwork} alt=""/>:"♫"}</span><span><strong>{track.title}</strong><small>{track.subtitle}</small></span></button>
    <div className={`track-rank-buttons ${track.eligible&&track.listened?"is-unlocked":"is-locked"}`} aria-label={`Rank ${track.title}`}>{[1,2,3].map(rank=><button type="button" key={rank} className={track.ranking===rank?"selected":track.eligible&&track.listened?"available":""} disabled={pending||!track.eligible||!track.listened} onClick={()=>rankTrack(track.id,rank)}>{rank}</button>)}<small className="track-rank-state">{!track.eligible?"CREDITED · CANNOT RANK":track.listened?"RANKING UNLOCKED":"LISTEN 60% TO UNLOCK"}</small></div>
    {resultsVisible&&<div className="track-result-score"><strong>{Math.round(track.finalScore||0)}</strong><small>final</small>{showDetailedStats&&<span>{Math.round(track.communityScore||0)} community · {Math.round(track.arScore||0)} A&amp;R · {track.firstPlaceVotes||0} firsts</span>}</div>}
   </article>)}
  </div>
 </section>;
}
