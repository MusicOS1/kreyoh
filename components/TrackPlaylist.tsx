"use client";

import {useEffect,useRef,useState} from "react";
import {readPreference,writePreference,restoreListening} from "../lib/listeningState";
import {useMusicIdentity} from "./SessionExperience";
import {usePathname} from "next/navigation";
import {moveQueueTrack,nextPlaybackIndex} from "../lib/playerQueue";
import {backgroundInteraction} from "../lib/backgroundInteraction";
import {Volume2Icon,VolumeXIcon} from "./Icons";

// Stable shared empty list: never recreate a dependency array during render.
const EMPTY_SAVED_IDS: string[] = [];

/** Shared accessible transport artwork; the audio/queue engine is unchanged. */
function PlayerGlyph({kind}:{kind:"shuffle"|"previous"|"play"|"pause"|"next"|"repeat"|"heart"}){
 const props={width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true as const};
 switch(kind){
  case "play":return <svg {...props} viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5L8 5.5Z" fill="currentColor" stroke="none"/></svg>;
  case "pause":return <svg {...props}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></svg>;
  case "previous":return <svg {...props}><path d="M5 5v14M19 5 9 12l10 7V5Z"/></svg>;
  case "next":return <svg {...props}><path d="M19 5v14M5 5l10 7-10 7V5Z"/></svg>;
  case "shuffle":return <svg {...props}><path d="m17 3 4 4-4 4M3 17h3c5 0 7-10 12-10h3M17 21l4-4-4-4M3 7h3c2.5 0 4.1 2.2 5.5 4.5M14 16c1.1.7 2.4 1 4 1h3"/></svg>;
  case "repeat":return <svg {...props}><path d="m17 2 4 4-4 4M3 10V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 14v2a2 2 0 0 1-2 2H3"/></svg>;
  case "heart":return <svg {...props}><path d="M20.6 5.7a5.5 5.5 0 0 0-7.8 0l-.8.8-.8-.8a5.5 5.5 0 1 0-7.8 7.8L12 22l8.6-8.5a5.5 5.5 0 0 0 0-7.8Z"/></svg>;
 }
}


export type PlaylistTrack={id:string;title:string;subtitle:string;src:string;artwork?:string;ranking?:number;listened:boolean;eligible:boolean;finalScore?:number;communityScore?:number;arScore?:number;firstPlaceVotes?:number;};

export default function TrackPlaylist({tracks,resultsVisible=false,showDetailedStats=false,enableRanking=true,votingOpen=true,autoStart=false,compact=false,onTrackPlay,onProgress,onPlaybackChange,seekRequest,playRequest,persistenceKey,showSaveAction=false,initialSavedIds=EMPTY_SAVED_IDS}:{tracks:PlaylistTrack[];resultsVisible?:boolean;showDetailedStats?:boolean;enableRanking?:boolean;votingOpen?:boolean;autoStart?:boolean;compact?:boolean;onTrackPlay?:(id:string)=>void;onProgress?:(id:string,position:number,duration:number)=>void;onPlaybackChange?:(id:string,playing:boolean)=>void;seekRequest?:{id:string;time:number;nonce:number};playRequest?:{id:string;nonce:number};persistenceKey?:string;showSaveAction?:boolean;initialSavedIds?:string[]}){
 const[current,setCurrent]=useState(0),[localTracks,setLocalTracks]=useState(tracks),[notice,setNotice]=useState(""),[isPlaying,setIsPlaying]=useState(false),[expanded,setExpanded]=useState(false),[pending,setRankPending]=useState(false);
 const [shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState<"off"|"all"|"one">("off"),[speed,setSpeed]=useState(1),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(1);
 const {identity,ready}=useMusicIdentity();
 const [savedIds,setSavedIds]=useState<string[]>(initialSavedIds),[savingTrack,setSavingTrack]=useState<string|null>(null);
 useEffect(()=>setSavedIds(initialSavedIds),[initialSavedIds]);
 const pathname=usePathname();
 const storageKey=persistenceKey||(identity?`fm-listening:${identity.id}:workspace:${pathname}`:"");
 const restoredKey=useRef(""),pendingPosition=useRef<{id:string;position:number}|null>(null),lastSaved=useRef(0);
 const [canResume,setCanResume]=useState(false);
 const processedCommand=useRef<number|null>(null);
 const playNextId=useRef<string|null>(null);
 const played=useRef<number[]>([]),history=useRef<number[]>([]),lastAudibleVolume=useRef(1);
 const audioRef=useRef<HTMLAudioElement>(null),autoPlayRef=useRef(autoStart),listenRecorded=useRef(new Set(tracks.filter(t=>t.listened).map(t=>t.id)));

 useEffect(()=>{const id=localTracks[current]?.id;setLocalTracks(tracks);const next=tracks.findIndex(t=>t.id===id);setCurrent(next<0?0:next);played.current=[];history.current=[];},[tracks]);
 useEffect(()=>{
  if(!ready||!storageKey||restoredKey.current===storageKey||!tracks.length)return;
  restoredKey.current=storageKey;
  const saved=restoreListening(readPreference(storageKey),tracks.map(t=>t.id));
  if(!saved)return;
  const byId=new Map(tracks.map(t=>[t.id,t]));
  const ordered=[...saved.ids.map(id=>byId.get(id)!),...tracks.filter(t=>!saved.ids.includes(t.id))];
  const requested=playRequest&&ordered.some(t=>t.id===playRequest.id)?playRequest.id:saved.selected;
  setLocalTracks(ordered);setCurrent(ordered.findIndex(t=>t.id===requested));
  if(requested!==saved.selected){pendingPosition.current=null;return;}
  pendingPosition.current={id:saved.selected,position:saved.position};if(audioRef.current&&audioRef.current.readyState>=1&&localTracks[current]?.id===saved.selected){audioRef.current.currentTime=Math.min(saved.position,audioRef.current.duration||saved.position);setPosition(audioRef.current.currentTime);pendingPosition.current=null;}setCanResume(true);autoPlayRef.current=false;
 },[tracks,storageKey,ready]);
 function savePosition(force=false){
  const audio=audioRef.current;if(!storageKey||!audio||restoredKey.current!==storageKey||!selected)return;
  if(!force&&Date.now()-lastSaved.current<3000)return;
  lastSaved.current=Date.now();
  writePreference(storageKey,{version:1,ids:localTracks.map(t=>t.id),selected:selected.id,position:pendingPosition.current?.id===selected.id?pendingPosition.current.position:audio.currentTime,updatedAt:Date.now()});
 }
 useEffect(()=>{const save=()=>savePosition(true);window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",save);return()=>{window.removeEventListener("pagehide",save);document.removeEventListener("visibilitychange",save);};},[storageKey,localTracks,current]);
 const rankLock=useRef(false);
 const selected=localTracks[Math.min(current,Math.max(0,localTracks.length-1))];

 useEffect(()=>{const p=audioRef.current;if(!p)return;p.playbackRate=speed;if(autoPlayRef.current){autoPlayRef.current=false;p.play().catch(()=>setIsPlaying(false));}},[current,selected?.src,speed]);

 useEffect(()=>{if(seekRequest&&selected?.id===seekRequest.id&&audioRef.current)audioRef.current.currentTime=seekRequest.time;},[seekRequest]);
 // A new command targets a song in the existing player: it never remounts the audio queue.
 // Clicking the active song pauses/resumes instead of seeking back to zero.
 useEffect(()=>{
  if(!playRequest||processedCommand.current===playRequest.nonce)return;
  processedCommand.current=playRequest.nonce;
  setCanResume(false);
  const index=localTracks.findIndex(track=>track.id===playRequest.id);
  if(index<0)return;
  if(index===current){const audio=audioRef.current;if(audio){if(audio.paused)audio.play().catch(()=>setIsPlaying(false));else audio.pause();}}
  else{autoPlayRef.current=true;setCurrent(index);}
 },[playRequest]);
 if(!localTracks.length)return <div className="track-chart-empty">Add an audio version to a track and it will enter the listening room.</div>;

 function selectTrack(index:number,autoplay=true,restartCurrent=false){savePosition(true);setCanResume(false);const next=Math.max(0,Math.min(index,localTracks.length-1));setNotice("");if(next===current){const p=audioRef.current;if(!p)return;if(restartCurrent){p.currentTime=0;if(autoplay)p.play().catch(()=>setIsPlaying(false));}else togglePlayback();return;}autoPlayRef.current=autoplay;setCurrent(next);}
 function previousTrack(){if(audioRef.current&&audioRef.current.currentTime>3){audioRef.current.currentTime=0;return;}selectTrack(history.current.pop()??(current<=0?localTracks.length-1:current-1),true,true);}
 function advance(ended:boolean){const queued=localTracks.findIndex(t=>t.id===playNextId.current);const next=queued>=0?queued:nextPlaybackIndex(localTracks.length,current,shuffle,repeat,played.current,ended);playNextId.current=null;if(next===null){setIsPlaying(false);return;}if(next!==current){if(played.current.length>=localTracks.length-1)played.current=[];played.current.push(current);history.current.push(current);}selectTrack(next,true,true);}
 function moveTrack(index:number,target:number){const id=selected.id;const next=moveQueueTrack(localTracks,index,target);setLocalTracks(next);setCurrent(next.findIndex(t=>t.id===id));played.current=[];history.current=[];}
 function nextTrack(){advance(false);}
 function ended(){advance(true);}
 function togglePlayback(){setCanResume(false);const p=audioRef.current;if(!p)return;p.paused?p.play().catch(()=>setIsPlaying(false)):p.pause();}
 function setPlayerVolume(value:number){const next=Math.max(0,Math.min(1,value));if(next>0)lastAudibleVolume.current=next;setVolume(next);if(audioRef.current)audioRef.current.volume=next;}
 function toggleMute(){setPlayerVolume(volume===0?lastAudibleVolume.current:0);}
 async function toggleSaved(){
  if(!identity){window.location.assign("/login?next=/fan");return;}
  if(savingTrack)return;
  const id=selected.id,wasSaved=savedIds.includes(id);
  setSavingTrack(id);setSavedIds(old=>wasSaved?old.filter(item=>item!==id):[...old,id]);setNotice("");
  try{
   const result=await backgroundInteraction<{ok:boolean;error?:string}>("library",{kind:"saved",id,enabled:!wasSaved});
   if(!result.ok)throw new Error(result.error||"Could not save this song.");
   window.dispatchEvent(new CustomEvent("fm-library-change",{detail:{kind:"saved",id,enabled:!wasSaved}}));
  }catch(error){
   setSavedIds(old=>wasSaved?[...new Set([...old,id])]:old.filter(item=>item!==id));
   setNotice(error instanceof Error?error.message:"Could not update liked songs. Try again.");
  }finally{setSavingTrack(null);}
 }


 function captureListen(){
  if(!enableRanking||!votingOpen)return;
  const p=audioRef.current;if(!p?.duration||listenRecorded.current.has(selected.id))return;
  const percent=Math.round((p.currentTime/p.duration)*100);if(percent<60)return;
  listenRecorded.current.add(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:true}:item));
  const eligible=selected.eligible;
  void (async()=>{try{const result=await backgroundInteraction<{ok:boolean;error?:string}>("versionListen",{id:selected.id,value:percent});if(!result.ok)throw new Error(result.error);setNotice(eligible?"Ranking unlocked. Choose #1, #2 or #3.":"Listening complete. You are credited on this track, so it cannot be included in your own ballot.");}catch(cause){listenRecorded.current.delete(selected.id);setLocalTracks(items=>items.map(item=>item.id===selected.id?{...item,listened:false}:item));setNotice(cause instanceof Error?cause.message:"Listening progress could not be saved.");}})();
 }

 async function rankTrack(trackId:string,rank:number){
  if(rankLock.current)return;rankLock.current=true;setRankPending(true);setNotice('');
  const previous=localTracks.map(item=>({id:item.id,ranking:item.ranking}));
  setLocalTracks(items=>items.map(item=>({...item,ranking:item.id===trackId?rank:item.ranking===rank?undefined:item.ranking})));
  try{const result=await backgroundInteraction<{ok:boolean;error?:string}>('versionRank',{id:trackId,value:rank});if(!result.ok)throw new Error(result.error);setNotice(`Your #${rank} selection is recorded.`);}
  catch(cause){setLocalTracks(items=>items.map(item=>({...item,ranking:previous.find(old=>old.id===item.id)?.ranking})));setNotice(cause instanceof Error?cause.message:'Your selection could not be recorded.');}
  finally{rankLock.current=false;setRankPending(false);}
 }


 const clock=(value:number)=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}`;
 return <section className={"track-chart-room spotify-room refined-player"+(compact?" fan-player-compact":"")+(expanded?" is-expanded":"")}><style>{`
 .track-playlist-transport{display:flex;align-items:center;justify-content:center;gap:9px;margin:10px 0 4px}
 .track-playlist-transport button{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;font-weight:900}
 .track-playlist-transport button[aria-pressed="true"]{border-color:#ff8a1f;color:#ffad63;background:#ff8a1f22}.player-mode-label{text-align:center;font-size:12px;color:#aaa}
 .track-playlist-transport .main{width:50px;height:50px;background:#f97316;color:#120a05;border-color:rgba(249,115,22,.4)}
 `}</style>
  <div className="track-chart-player">
   <div className={selected.artwork?"track-player-art has-artwork":"track-player-art"}>{selected.artwork?<img src={selected.artwork} alt={`${selected.title} artwork`}/>:<span aria-hidden="true">♫</span>}</div>
   <div className="track-player-copy"><span>NOW PLAYING</span><h3>{selected.title}</h3><p>{selected.subtitle}</p></div>
   {showSaveAction&&<button type="button" className="player-save-toggle" aria-label={savedIds.includes(selected.id)?"Remove "+selected.title+" from liked songs":"Save "+selected.title+" to liked songs"} title={savedIds.includes(selected.id)?"Remove from liked songs":"Save to liked songs"} aria-pressed={savedIds.includes(selected.id)} disabled={Boolean(savingTrack)} onClick={()=>void toggleSaved()}><PlayerGlyph kind="heart"/></button>}
   <audio ref={audioRef} key={selected.src} src={selected.src} preload="metadata" onLoadedMetadata={()=>{setDuration(audioRef.current?.duration||0);const pending=pendingPosition.current;
    const audio=audioRef.current;
    if(audio){audio.volume=volume;if(pending?.id===selected.id){const time=Math.min(pending.position,Math.max(0,(Number.isFinite(audio.duration)?audio.duration:pending.position)-.1));audio.currentTime=time;setPosition(time);pendingPosition.current=null;}else setPosition(0);}}} onPlay={()=>{setIsPlaying(true);onPlaybackChange?.(selected.id,true);onTrackPlay?.(selected.id);}} onPause={()=>{savePosition(true);setIsPlaying(false);onPlaybackChange?.(selected.id,false);}} onTimeUpdate={()=>{savePosition();setPosition(audioRef.current?.currentTime||0);captureListen();if(audioRef.current)onProgress?.(selected.id,audioRef.current.currentTime,Number.isFinite(audioRef.current.duration)?audioRef.current.duration:0);}} onEnded={ended} onError={()=>{setIsPlaying(false);setNotice("This audio could not be loaded. Refresh the page and try again.");}}/>
   {canResume&&<button type="button" className="resume-listening" onClick={togglePlayback}>Resume Listening</button>}
   <div className="player-progress"><input style={{background:`linear-gradient(to right, #ff6a00 0%, #ff6a00 ${duration>0?Math.min(100,Math.max(0,position/duration*100)):0}%, #555 ${duration>0?Math.min(100,Math.max(0,position/duration*100)):0}%, #555 100%)`}} type="range" aria-label="Seek in track" min={0} max={Number.isFinite(duration)?duration:0} step={0.1} value={position} onChange={e=>{if(audioRef.current)audioRef.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}/><div><span>{clock(position)}</span><span>{clock(Number.isFinite(duration)?duration:0)}</span></div></div>
   <div className="track-playlist-transport" aria-label="Playlist controls"><button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={()=>{played.current=[];setShuffle(value=>!value);}} title="Shuffle"><PlayerGlyph kind="shuffle"/></button><button type="button" onClick={previousTrack} aria-label="Previous track"><PlayerGlyph kind="previous"/></button><button type="button" className="main" onClick={togglePlayback} aria-label={isPlaying?"Pause":"Play"}>{isPlaying?<PlayerGlyph kind="pause"/>:<PlayerGlyph kind="play"/>}</button><button type="button" onClick={nextTrack} aria-label="Next track"><PlayerGlyph kind="next"/></button><button type="button" aria-label={`Repeat: ${repeat}`} aria-pressed={repeat!=="off"} title={`Repeat: ${repeat}`} onClick={()=>setRepeat(value=>value==="off"?"all":value==="all"?"one":"off")}><PlayerGlyph kind="repeat"/>{repeat==="one"&&<span className="repeat-one">1</span>}</button></div><p className="player-mode-label">{shuffle?"Shuffle on":"In order"} · Repeat {repeat} · {current+1} / {localTracks.length}</p>
   <div className="player-volume" role="group" aria-label="Volume controls">
     <button type="button" className="player-mute-toggle" aria-label={volume===0?"Unmute":"Mute"} aria-pressed={volume===0} onClick={toggleMute}>
      {volume===0?<VolumeXIcon size={19}/>:<Volume2Icon size={19}/>}
     </button>
     <input type="range" aria-label="Volume" min="0" max="1" step="0.01" value={volume} onChange={e=>setPlayerVolume(Number(e.target.value))}/>
    </div>
   <label className="player-speed">Playback speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.75,1,1.25,1.5,2].map(value=><option value={value} key={value}>{value}×</option>)}</select></label>
   {enableRanking&&<small className="track-listen-rule">{votingOpen?"Listen to 60% to unlock ranking. Contributors cannot rank their own track.":"Voting is closed. Your ballot is locked; keep listening to the final selection."}</small>}
   {notice&&<div className="track-ballot-notice" role="status">{notice}</div>}
  </div>
  {compact&&<button className="fan-queue-toggle" type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?"Hide queue":"Open queue"} <span aria-hidden="true">{expanded?"⌄":"⌃"}</span></button>}
  {(!compact||expanded)&&<div className="track-chart-list">{enableRanking&&<div className="ballot-summary"><strong>{votingOpen?(localTracks.filter(t=>t.ranking).length===3?"Your Top 3 is saved":"Build your Top 3"):"Final results · voting closed"}</strong><p>{votingOpen?"Your selections are saved as you vote. You can change them until the round closes.":"The published order is the final chart. Queue changes only change your listening order."}</p>{localTracks.filter(t=>t.ranking).sort((a,b)=>(a.ranking||0)-(b.ranking||0)).map(t=><span key={t.id}>#{t.ranking} {t.title}</span>)}</div>}<header><span>#</span><span>Track</span><span>{enableRanking?(votingOpen?"Your Top 3":"Final results"):"Playing queue"}</span></header>
   {localTracks.map((track,index)=><article className={index===current?"is-current":""} key={track.id}>
    <button type="button" className="track-chart-select" aria-label={index===current&&isPlaying?"Pause "+track.title:"Play "+track.title} onClick={()=>selectTrack(index,true)}><b>{resultsVisible?String(tracks.findIndex(t=>t.id===track.id)+1).padStart(2,"0"):index===current&&isPlaying?"Ⅱ":"▶"}</b><span className={track.artwork?"track-row-art has-artwork":"track-row-art"}>{track.artwork?<img src={track.artwork} alt=""/>:"♫"}</span><span><strong>{track.title}</strong><small>{track.subtitle}</small></span></button>
    {enableRanking&&votingOpen&&<div className={`track-rank-buttons ${track.eligible&&track.listened?"is-unlocked":"is-locked"}`} aria-label={`Rank ${track.title}`}>{[1,2,3].map(rank=><button type="button" key={rank} className={track.ranking===rank?"selected":track.eligible&&track.listened?"available":""} disabled={pending||!track.eligible||!track.listened} onClick={()=>rankTrack(track.id,rank)}>{rank}</button>)}<small className="track-rank-state">{!track.eligible?"CREDITED · CANNOT RANK":track.listened?"RANKING UNLOCKED":"LISTEN 60% TO UNLOCK"}</small></div>}
    <div className="queue-row-actions"><button type="button" disabled={index===0} aria-label={`Move ${track.title} up in queue`} onClick={()=>moveTrack(index,index-1)}>↑</button><button type="button" disabled={index===localTracks.length-1} aria-label={`Move ${track.title} down in queue`} onClick={()=>moveTrack(index,index+1)}>↓</button><button type="button" disabled={index===current} onClick={()=>{playNextId.current=track.id;moveTrack(index,index<current?current:current+1);setNotice(`${track.title} will play next.`);}} aria-label={`Play ${track.title} next`}>Play next</button></div>
    {resultsVisible&&<div className="track-result-score"><strong>{Math.round(track.finalScore||0)}</strong><small>final</small>{showDetailedStats&&<span>{Math.round(track.communityScore||0)} community · {Math.round(track.arScore||0)} A&amp;R · {track.firstPlaceVotes||0} firsts</span>}</div>}
   </article>)}
  </div>}
 </section>;
}
