"use client";
import {createContext,useContext,useEffect,useMemo,useRef,useState} from "react";
import styles from './PersistentPlayer.module.css';
import TrackPlaylist,{type PlaylistTrack} from "./TrackPlaylist";
import {useMusicIdentity} from "./SessionExperience";
import {readPreference,restoreListening} from "../lib/listeningState";
type Progress={id:string;position:number;duration:number;isPlaying:boolean};
const empty:Progress={id:"",position:0,duration:0,isPlaying:false};
const Context=createContext({progress:empty,play:(_id:string)=>{},seek:(_id:string,_time:number)=>{}});
export const useListening=()=>useContext(Context);
export default function ListeningProvider({children}:{children:React.ReactNode}) {
 const {identity,ready}=useMusicIdentity();
 const [queue,setQueue]=useState<PlaylistTrack[]>([]),[started,setStarted]=useState(false),[progress,setProgress]=useState(empty),[playRequest,setPlayRequest]=useState<{id:string;nonce:number}>(),[seekRequest,setSeekRequest]=useState<{id:string;time:number;nonce:number}>();
 const pending=useRef<string|null>(null),nonce=useRef(0),scope=identity?.id||"public";
 const storageKey=`fm-listening:${scope}:published`;
 useEffect(()=>{
  let alive=true;
  setQueue([]);setStarted(false);setProgress(empty);setPlayRequest(undefined);
  async function load(){try{
   const response=await fetch("/api/listening",{cache:"no-store"});if(!response.ok)return;
   const {releases}=await response.json();if(!alive||!Array.isArray(releases))return;
   const tracks:PlaylistTrack[]=releases.map(r=>({id:r.id,title:r.title,subtitle:r.artist_name,src:`/api/releases/${r.id}/media`,artwork:r.has_cover?`/api/releases/${r.id}/media?kind=cover`:undefined,listened:false,eligible:false}));
   const saved=restoreListening(readPreference(storageKey),tracks.map(t=>t.id));
   setQueue(tracks);if(saved)setStarted(true);
   if(pending.current&&tracks.some(t=>t.id===pending.current)){setStarted(true);setPlayRequest({id:pending.current,nonce:++nonce.current});pending.current=null;}
  }catch{}}
  if(ready)void load();
  const online=()=>void load();window.addEventListener("online",online);
  return()=>{alive=false;window.removeEventListener("online",online);};
 },[ready,scope]);
 useEffect(()=>{document.body.classList.toggle("has-music-player",started);return()=>document.body.classList.remove("has-music-player");},[started]);
 useEffect(()=>{const stop=()=>{setStarted(false);setQueue([]);setProgress(empty);pending.current=null;};window.addEventListener("fm-signed-out",stop);return()=>window.removeEventListener("fm-signed-out",stop);},[]);
 const controls=useMemo(()=>({progress,play:(id:string)=>{if(!queue.some(t=>t.id===id)){pending.current=id;return;}setStarted(true);setPlayRequest({id,nonce:++nonce.current});},seek:(id:string,time:number)=>{if(queue.some(t=>t.id===id))setSeekRequest({id,time,nonce:++nonce.current});}}),[queue,progress]);
 // A private project player takes audio focus; the shared public player survives route changes.
 useEffect(()=>{const focus=(event:Event)=>{const target=event.target;if(target instanceof HTMLMediaElement){document.querySelectorAll<HTMLMediaElement>("audio,video").forEach(media=>{if(media!==target)media.pause();});}};document.addEventListener("play",focus,true);return()=>document.removeEventListener("play",focus,true);},[]);
 return <Context.Provider value={controls}>{children}{started&&queue.length>0&&<section className={`${styles.dock} global-listening-player`} aria-label="Your listening queue"><button className="dismiss-listening" aria-label="Close listening player" onClick={()=>{setStarted(false);setProgress(empty);try{localStorage.removeItem(storageKey);}catch{}}}>×</button><TrackPlaylist key={storageKey} persistenceKey={storageKey} tracks={queue} compact enableRanking={false} playRequest={playRequest} seekRequest={seekRequest} onProgress={(id,position,duration)=>setProgress(p=>({...p,id,position,duration}))} onPlaybackChange={(id,isPlaying)=>setProgress(p=>({...p,id,isPlaying}))}/></section>}</Context.Provider>;
}
