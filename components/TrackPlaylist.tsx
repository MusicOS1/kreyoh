"use client";

import {useEffect,useRef,useState,useTransition} from "react";
import {moveQueueTrack,nextPlaybackIndex} from "../lib/playerQueue";
import {recordTrackVersionListen,setTrackVersionRanking} from "../app/tracks/actions";

export type PlaylistTrack={id:string;title:string;subtitle:string;src:string;artwork?:string;ranking?:number;listened:boolean;eligible:boolean;finalScore?:number;communityScore?:number;arScore?:number;firstPlaceVotes?:number;};

export default function TrackPlaylist({tracks,resultsVisible=false,showDetailedStats=false,enableRanking=true,votingOpen=true,autoStart=false,dock=false,onTrackPlay,onProgress,seekRequest}:{tracks:PlaylistTrack[];resultsVisible?:boolean;showDetailedStats?:boolean;enableRanking?:boolean;votingOpen?:boolean;autoStart?:boolean;dock?:boolean;onTrackPlay?:(id:string)=>void;onProgress?:(id:string,position:number,duration:number)=>void;seekRequest?:{id:string;time:number;nonce:number}}){
 const[current,setCurrent]=useState(0),[localTracks,setLocalTracks]=useState(tracks),[notice,setNotice]=useState(""),[isPlaying,setIsPlaying]=useState(false),[pending,startTransition]=useTransition();
 const [shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState<"off"|"all"|"one">("off"),[speed,setSpeed]=useState(1),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(1);
 const[queueOpen,setQueueOpen]=useState(false);
 const playNextId=useRef<string|null>(null);
 const played=useRef<number[]>([]),history=useRef<number[]>([]);
 const audioRef=useRef<HTMLAudioElement>(null),autoPlayRef=useRef(autoStart),listenRecorded=useRef(new Set(tracks.filter(t=>t.listened).map(t=>t.id)));

 useEffect(()=>{const id=localTracks[current]?.id;setLocalTracks(tracks);const next=tracks.findIndex(t=>t.id===id);setCurrent(next<0?0:next);played.current=[];history.current=[];},[tracks]);
 const selected=localTracks[Math.min(current,Math.max(0,localTracks.length-1))];

 useEffect(()=>{const p=audioRef.current;if(!p)return;p.playbackRate=speed;if(autoPlayRef.current){autoPlayRef.current=false;p.play().catch(()=>setIsPlaying(false));}},[current,selected?.src,speed]);

 useEffect(()=>{if(seekRequest&&selected?.id===seekRequest.id&&audioRef.current)audioRef.current.currentTime=seekRequest.time;},[seekRequest]);
 if(!localTracks.length)return <div className="track-chart-empty">Add an audio version to a track and it will enter the listening room.</div>;

 function selectTrack(index:number,autoplay=true){const next=Math.max(0,Math.min(index,localTracks.length-1));setNotice("");if(next===current){const p=audioRef.current;if(p){p.currentTime=0;if(autoplay)p.play().catch(()=>setIsPlaying(false));}return;}autoPlayRef.current=autoplay;setCurrent(next);}
 function previousTrack(){if(audioRef.current&&audioRef.current.currentTime>3){audioRef.current.currentTime=0;return;}selectTrack(history.current.pop()??(current<=0?localTracks.length-1:current-1),true);}
 function advance(ended:boolean){const queued=localTracks.findIndex(t=>t.id===playNextId.current);const next=queued>=0?queued:nextPlaybackIndex(localTracks.length,current,shuffle,repeat,played.current,ended);playNextId.current=null;if(next===null){setIsPlaying(false);return;}if(next!==current){if(played.current.length>=localTracks.length-1)played.current=[];played.current.push(current);history.current.push(current);}selectTrack(next,true);}
 function moveTrack(index:number,target:number){const id=selected.id;const next=moveQueueTrack(localTracks,index,target);setLocalTracks(next);setCurrent(next.findIndex(t=>t.id===id));played.current=[];history.current=[];}
 function nextTrack(){advance(false);}
 function ended(){advance(true);}
 function togglePlayback(){const p=audioRef.current;if(!p)return;p.paused?p.play().catch(()=>setIsPlaying(false)):p.pause();}

 function captureListen(){
  if(!enableRanking||!votingOpen)return;
  const p=audioRef.current;if(!p?.duration||listenRecorded.current.has(selected.id))return;
  const percent=Math.round((p.currentTime/p.duration)*100);if(percent<60)return;
  listenRecorded.current.add(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:true}:item));
  const eligible=selected.eligible;
  startTransition(async()=>{try{const result=await recordTrackVersionListen(selected.id,percent);if(!result.ok)throw new Error(result.error);setNotice(eligible?"Ranking unlocked. Choose #1, #2 or #3.":"Listening complete. You are credited on this track, so it cannot be included in your own ballot.");}catch(cause){listenRecorded.current.delete(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:false}:item));setNotice(cause instanceof Error?cause.message:"Listening progress could not be saved.");}});
 }

 function rankTrack(trackId:string,rank:number){setNotice("");startTransition(async()=>{try{const result=await setTrackVersionRanking(trackId,rank);if(!result.ok)throw new Error(result.error);setLocalTracks(items=>items.map(item=>({...item,ranking:item.id===trackId?rank:item.ranking===rank?undefined:item.ranking})));setNotice(`Your #${rank} selection is recorded.`);}catch(cause){setNotice(cause instanceof Error?cause.message:"Your selection could not be recorded.");}});}

 const clock=(value:number)=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}`;
 return <section className={`track-chart-room spotify-room refined-player ${dock?"dock-player":""} ${queueOpen?"queue-open":""}`}><style>{`
 .track-playlist-transport{display:flex;align-items:center;justify-content:center;gap:9px;margin:10px 0 4px}
 .track-playlist-transport button{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;font-weight:900}
 .track-playlist-transport button[aria-pressed="true"]{border-color:#ff8a1f;color:#ffad63;background:#ff8a1f22}.player-mode-label{text-align:center;font-size:12px;color:#aaa}
 .track-playlist-transport .main{width:50px;height:50px;background:#f97316;color:#120a05;border-color:rgba(249,115,22,.4)}
 `}</style>
  <div className="track-chart-player">
   <div className={selected.artwork?"track-player-art has-artwork":"track-player-art"}>{selected.artwork?<img src={selected.artwork} alt={`${selected.title} artwork`}/>:<span aria-hidden="true">♫</span>}</div>
   <div className="track-player-copy"><span>NOW PLAYING</span><h3>{selected.title}</h3><p>{selected.subtitle}</p></div>
   <audio ref={audioRef} key={selected.src} src={selected.src} preload="metadata" onLoadedMetadata={()=>{setDuration(audioRef.current?.duration||0);setPosition(0);if(audioRef.current)audioRef.current.volume=volume;}} onPlay={()=>{setIsPlaying(true);onTrackPlay?.(selected.id);}} onPause={()=>setIsPlaying(false)} onTimeUpdate={()=>{setPosition(audioRef.current?.currentTime||0);captureListen();if(audioRef.current)onProgress?.(selected.id,audioRef.current.currentTime,Number.isFinite(audioRef.current.duration)?audioRef.current.duration:0);}} onEnded={ended} onError={()=>{setIsPlaying(false);setNotice("This audio could not be loaded. Refresh the page and try again.");}}/>
   <div className="player-progress"><input type="range" aria-label="Seek in track" min={0} max={Number.isFinite(duration)?duration:0} step={0.1} value={position} onChange={e=>{if(audioRef.current)audioRef.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}/><div><span>{clock(position)}</span><span>{clock(Number.isFinite(duration)?duration:0)}</span></div></div>
   <div className="track-playlist-transport" aria-label="Playlist controls"><button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={()=>{played.current=[];setShuffle(value=>!value);}} title="Shuffle">⤨</button><button type="button" onClick={previousTrack} aria-label="Previous track">◀◀</button><button type="button" className="main" onClick={togglePlayback} aria-label={isPlaying?"Pause":"Play"}>{isPlaying?"Ⅱ":"▶"}</button><button type="button" onClick={nextTrack} aria-label="Next track">▶▶</button><button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat!=="off"} title={`Repeat: ${repeat}`} onClick={()=>setRepeat(value=>value==="off"?"all":value==="all"?"one":"off")}>{repeat==="one"?"↻ 1":"↻"}</button></div><p className="player-mode-label">{shuffle?"Shuffle on":"In order"} · Repeat {repeat} · {current+1} / {localTracks.length}</p>
   <label className="player-volume">Volume<input type="range" aria-label="Volume" min="0" max="1" step="0.01" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);if(audioRef.current)audioRef.current.volume=v;}}/></label>
   <label className="player-speed">Playback speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.75,1,1.25,1.5,2].map(value=><option value={value} key={value}>{value}×</option>)}</select></label>
   {enableRanking&&<small className="track-listen-rule">{votingOpen?"Listen to 60% to unlock ranking. Contributors cannot rank their own track.":"Voting is closed. Your ballot is locked; keep listening to the final selection."}</small>}
   {notice&&<div className="track-ballot-notice" role="status">{notice}</div>}
  </div>
  {dock&&<button className="dock-queue-toggle" aria-expanded={queueOpen} aria-controls="dock-playing-queue" onClick={()=>setQueueOpen(!queueOpen)}>{queueOpen?"Close queue ×":"Queue ☷"}</button>}
  <div id={dock?"dock-playing-queue":undefined} className="track-chart-list" hidden={dock&&!queueOpen}>{enableRanking&&<div className="ballot-summary"><strong>{votingOpen?(localTracks.filter(t=>t.ranking).length===3?"Your Top 3 is saved":"Build your Top 3"):"Final results · voting closed"}</strong><p>{votingOpen?"Your selections are saved as you vote. You can change them until the round closes.":"The published order is the final chart. Queue changes only change your listening order."}</p>{localTracks.filter(t=>t.ranking).sort((a,b)=>(a.ranking||0)-(b.ranking||0)).map(t=><span key={t.id}>#{t.ranking} {t.title}</span>)}</div>}<header><span>#</span><span>Track</span><span>{enableRanking?(votingOpen?"Your Top 3":"Final results"):"Playing queue"}</span></header>
   {localTracks.map((track,index)=><article className={index===current?"is-current":""} key={track.id}>
    <button type="button" className="track-chart-select" onClick={()=>selectTrack(index,true)}><b>{resultsVisible?String(tracks.findIndex(t=>t.id===track.id)+1).padStart(2,"0"):index===current&&isPlaying?"Ⅱ":"▶"}</b><span className={track.artwork?"track-row-art has-artwork":"track-row-art"}>{track.artwork?<img src={track.artwork} alt=""/>:"♫"}</span><span><strong>{track.title}</strong><small>{track.subtitle}</small></span></button>
    {enableRanking&&votingOpen&&<div className={`track-rank-buttons ${track.eligible&&track.listened?"is-unlocked":"is-locked"}`} aria-label={`Rank ${track.title}`}>{[1,2,3].map(rank=><button type="button" key={rank} className={track.ranking===rank?"selected":track.eligible&&track.listened?"available":""} disabled={pending||!track.eligible||!track.listened} onClick={()=>rankTrack(track.id,rank)}>{rank}</button>)}<small className="track-rank-state">{!track.eligible?"CREDITED · CANNOT RANK":track.listened?"RANKING UNLOCKED":"LISTEN 60% TO UNLOCK"}</small></div>}
    <div className="queue-row-actions"><button type="button" disabled={index===0} aria-label={`Move ${track.title} up in queue`} onClick={()=>moveTrack(index,index-1)}>↑</button><button type="button" disabled={index===localTracks.length-1} aria-label={`Move ${track.title} down in queue`} onClick={()=>moveTrack(index,index+1)}>↓</button><button type="button" disabled={index===current} onClick={()=>{playNextId.current=track.id;moveTrack(index,index<current?current:current+1);setNotice(`${track.title} will play next.`);}} aria-label={`Play ${track.title} next`}>Play next</button></div>
    {resultsVisible&&<div className="track-result-score"><strong>{Math.round(track.finalScore||0)}</strong><small>final</small>{showDetailedStats&&<span>{Math.round(track.communityScore||0)} community · {Math.round(track.arScore||0)} A&amp;R · {track.firstPlaceVotes||0} firsts</span>}</div>}
   </article>)}
  </div>
 </section>;
}
