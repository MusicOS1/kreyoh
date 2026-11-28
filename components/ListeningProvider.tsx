"use client";
import {createContext,useContext,useEffect,useMemo,useRef,useState} from "react";
import styles from './PersistentPlayer.module.css';
import TrackPlaylist,{type PlaylistTrack} from "./TrackPlaylist";
import {useMusicIdentity} from "./SessionExperience";
import {readPreference,restoreListening} from "../lib/listeningState";
type PublicTrack={id:string;title:string;artist_name:string;has_cover:boolean};
type Progress={id:string;position:number;duration:number;isPlaying:boolean};
const empty:Progress={id:"",position:0,duration:0,isPlaying:false};
const Context=createContext({progress:empty,play:(_id:string,_catalogue?:PublicTrack[],_saved?:string[])=>{},seek:(_id:string,_time:number)=>{}});
export const useListening=()=>useContext(Context);
export default function ListeningProvider({children}:{children:React.ReactNode}) {
 const {identity,ready}=useMusicIdentity();
 const [queue,setQueue]=useState<PlaylistTrack[]>([]),[savedIds,setSavedIds]=useState<string[]>([]),[started,setStarted]=useState(false),[progress,setProgress]=useState(empty),[playRequest,setPlayRequest]=useState<{id:string;nonce:number}>(),[seekRequest,setSeekRequest]=useState<{id:string;time:number;nonce:number}>();
 const seeded=useRef(false),queueRequested=useRef(false),lastScope=useRef<string|null>(null);
 const pending=useRef<string|null>(null),nonce=useRef(0),scope=identity?.id||"public";
 const storageKey=`fm-listening:${scope}:published`;
 useEffect(()=>{
  let alive=true;
  if(lastScope.current!==null&&lastScope.current!==scope){seeded.current=false;queueRequested.current=false;pending.current=null;setQueue([]);setSavedIds([]);setStarted(false);setProgress(empty);setPlayRequest(undefined);}
  if(ready)lastScope.current=scope;
  async function load(){try{
   const response=await fetch("/api/listening",{cache:"no-store"});if(!response.ok)return;
   const {releases,savedIds:loadedSavedIds}=await response.json();if(!alive||!Array.isArray(releases))return;
   setSavedIds(Array.isArray(loadedSavedIds)?loadedSavedIds.filter((id:unknown)=>typeof id==="string"):[]);
   const tracks:PlaylistTrack[]=releases.map(r=>({id:r.id,title:r.title,subtitle:r.artist_name,src:`/api/releases/${r.id}/media`,artwork:r.has_cover?`/api/releases/${r.id}/media?kind=cover`:undefined,listened:false,eligible:false}));
   const saved=restoreListening(readPreference(storageKey),tracks.map(t=>t.id));
   if(!seeded.current){setQueue(tracks);if(saved)setStarted(true);}
   if(pending.current&&tracks.some(t=>t.id===pending.current)){setQueue(tracks);seeded.current=true;setStarted(true);setPlayRequest({id:pending.current,nonce:++nonce.current});pending.current=null;}
  }catch{}}
  const requestQueue=()=>{if(!queueRequested.current){queueRequested.current=true;void load().finally(()=>{queueRequested.current=false;});}};
  if((ready&&readPreference(storageKey)&&!seeded.current)||pending.current)requestQueue();
  window.addEventListener("fm-request-public-queue",requestQueue);
  const online=()=>{if(pending.current||readPreference(storageKey))requestQueue();};window.addEventListener("online",online);
  return()=>{alive=false;queueRequested.current=false;window.removeEventListener("online",online);window.removeEventListener("fm-request-public-queue",requestQueue);};
 },[ready,scope]);
 useEffect(()=>{document.body.classList.toggle("has-music-player",started);return()=>document.body.classList.remove("has-music-player");},[started]);
 useEffect(()=>{const stop=()=>{seeded.current=false;setStarted(false);setQueue([]);setProgress(empty);pending.current=null;};window.addEventListener("fm-signed-out",stop);return()=>window.removeEventListener("fm-signed-out",stop);},[]);
 const controls=useMemo(()=>({progress,play:(id:string,catalogue?:PublicTrack[],saved?:string[])=>{if(!queue.some(t=>t.id===id)){if(catalogue?.some(r=>r.id===id)){seeded.current=true;pending.current=null;setQueue(catalogue.map(r=>({id:r.id,title:r.title,subtitle:r.artist_name,src:`/api/releases/${r.id}/media`,artwork:r.has_cover?`/api/releases/${r.id}/media?kind=cover`:undefined,listened:false,eligible:false})));if(saved)setSavedIds(saved);}else{pending.current=id;window.dispatchEvent(new Event("fm-request-public-queue"));return;}}setStarted(true);setPlayRequest({id,nonce:++nonce.current});},seek:(id:string,time:number)=>{if(queue.some(t=>t.id===id))setSeekRequest({id,time,nonce:++nonce.current});}}),[queue,progress]);
 // A private project player takes audio focus; the shared public player survives route changes.
 useEffect(()=>{const focus=(event:Event)=>{const target=event.target;if(target instanceof HTMLMediaElement){if(target instanceof HTMLVideoElement&&target.muted)return;document.querySelectorAll<HTMLMediaElement>("audio,video").forEach(media=>{if(media!==target&&!(media instanceof HTMLVideoElement&&media.muted))media.pause();});}};document.addEventListener("play",focus,true);return()=>document.removeEventListener("play",focus,true);},[]);
 return <Context.Provider value={controls}>{children}{started&&queue.length>0&&<section className={`${styles.dock} global-listening-player`} aria-label="Your listening queue"><button className="dismiss-listening" aria-label="Close listening player" onClick={()=>{setStarted(false);setProgress(empty);try{localStorage.removeItem(storageKey);}catch{}}}>×</button><TrackPlaylist key={storageKey} persistenceKey={storageKey} tracks={queue} compact enableRanking={false} showSaveAction initialSavedIds={savedIds} systemMediaControls playRequest={playRequest} seekRequest={seekRequest} onProgress={(id,position,duration)=>setProgress(p=>({...p,id,position,duration}))} onPlaybackChange={(id,isPlaying)=>setProgress(p=>({...p,id,isPlaying}))}/></section>}</Context.Provider>;
}
