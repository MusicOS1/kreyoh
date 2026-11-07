"use client";
import {useEffect,useState} from "react";

/** Displays qualified listens from Supabase and reacts to a newly verified play in this browser.
 * Never increments for a click, skipped playback or server-deduplicated repeat.
 */
export default function MusicPlayCount({id,count}:{id:string;count?:number|null}){
 const [value,setValue]=useState<number|null>(count??null);
 useEffect(()=>setValue(count??null),[count,id]);
 useEffect(()=>{
  const update=(event:Event)=>{
   const detail=(event as CustomEvent<{releaseId?:string}>).detail;
   if(detail?.releaseId===id)setValue(previous=>previous===null?null:previous+1);
  };
  window.addEventListener("fm-qualified-play",update);
  return()=>window.removeEventListener("fm-qualified-play",update);
 },[id]);
 return <span className="fm-music-play-count" aria-label={value===null?"Plays unavailable":value+" recorded plays"}>
  {value===null?"Plays unavailable":value.toLocaleString()+" plays"}
 </span>;
}
