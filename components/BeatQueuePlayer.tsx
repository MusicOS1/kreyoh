"use client";
import {useEffect,useRef,useState} from "react";
type Beat={id:string;title:string;producer:string;code:string;src:string;artwork?:string;bpm?:number|null;musicKey?:string|null};
export default function BeatQueuePlayer({beats}:{beats:Beat[]}){
 const [current,setCurrent]=useState(0),[playing,setPlaying]=useState(false),[query,setQuery]=useState("");
 const audio=useRef<HTMLAudioElement>(null),playNext=useRef(false),logged=useRef(new Set<string>());
 const item=beats[current];
 useEffect(()=>{
  if(!audio.current||!item)return;
  if(playNext.current){playNext.current=false;void audio.current.play().catch(()=>setPlaying(false))}
 },[current,item?.id]);
 useEffect(()=>{
  if(!item||!("mediaSession" in navigator))return;
  try{navigator.mediaSession.metadata=new MediaMetadata({title:item.title,artist:item.producer,album:"FACKTS Beat Library",artwork:item.artwork?[{src:item.artwork}]:[]});navigator.mediaSession.playbackState=playing?"playing":"paused";
   navigator.mediaSession.setActionHandler("play",()=>void audio.current?.play());
   navigator.mediaSession.setActionHandler("pause",()=>audio.current?.pause());
   navigator.mediaSession.setActionHandler("nexttrack",()=>choose(Math.min(current+1,beats.length-1)));
   navigator.mediaSession.setActionHandler("previoustrack",()=>choose(Math.max(0,current-1)));
  }catch{}
 },[item?.id,current,playing]);
 function choose(index:number){
  if(index===current){if(audio.current?.paused)void audio.current.play().catch(()=>{});else audio.current?.pause();return}
  playNext.current=true;setCurrent(index);
 }
 function played(){
  setPlaying(true);
  if(!item||logged.current.has(item.id))return;
  logged.current.add(item.id);
  void fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_name:"beat_played",entity_type:"beat",entity_id:item.id})}).catch(()=>{});
 }
 function details(id:string){
  const target=document.getElementById("beat-"+id);
  if(target instanceof HTMLDetailsElement){target.open=true;target.scrollIntoView({behavior:"smooth",block:"center"})}
 }
 const matches=beats.map((b,i)=>({b,i})).filter(({b})=>[b.title,b.producer,b.code].join(" ").toLowerCase().includes(query.toLowerCase()));
 if(!beats.length)return null;
 return <section className="fm-beat-list-player" aria-label="Private beat player and queue">
  <div className="fm-beat-now">
   {item.artwork?<img src={item.artwork} alt="" className="fm-beat-art"/>:<span aria-hidden="true" className="fm-beat-art">♫</span>}
   <div><small>NOW PLAYING · BEAT LIBRARY</small><h2>{item.title}</h2><p>{item.producer} · {item.code}</p></div>
  </div>
  <div className="fm-beat-transport">
   <button aria-label="Previous beat" type="button" disabled={current===0} onClick={()=>choose(current-1)}>◀◀</button>
   <button aria-label={playing?"Pause":"Play"} type="button" onClick={()=>{if(audio.current?.paused)void audio.current.play().catch(()=>{});else audio.current?.pause()}}>{playing?"Ⅱ Pause":"▶ Play"}</button>
   <button aria-label="Next beat" type="button" disabled={current===beats.length-1} onClick={()=>choose(current+1)}>▶▶</button>
   <button type="button" onClick={()=>details(item.id)}>Beat details ↗</button>
  </div>
  {item.src?<audio key={item.id} ref={audio} controls preload="metadata" src={item.src} onPlay={played} onPause={()=>setPlaying(false)} onEnded={()=>{setPlaying(false);if(current<beats.length-1){playNext.current=true;setCurrent(x=>x+1)}}} aria-label={"Playing "+item.title}/>:<p>Audio not attached for this beat.</p>}
  <div className="fm-beat-queue-head"><strong>{beats.length} beats in queue</strong><input type="search" aria-label="Filter beats in current queue" placeholder="Find a beat…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <ol className="fm-beat-queue">{matches.map(({b,i})=><li key={b.id} className={i===current?"active":""}>
   <button type="button" onClick={()=>choose(i)} aria-label={"Play "+b.title}><span>{i===current&&playing?"♫":String(i+1).padStart(2,"0")}</span><strong>{b.title}</strong><small>{b.producer}</small><small>{[b.bpm&&b.bpm+" BPM",b.musicKey].filter(Boolean).join(" · ")}</small></button>
   <button type="button" className="fm-beat-row-detail" onClick={()=>details(b.id)}>Details ↗</button>
  </li>)}</ol>
 </section>;
}
