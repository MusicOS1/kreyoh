"use client";
import {useEffect,useState} from "react";
export default function SongPlayCount({id,count}:{id:string;count?:number|null}){
 const [value,setValue]=useState<number|null>(count??null);
 useEffect(()=>setValue(count??null),[count]);
 useEffect(()=>{
  const update=(event:Event)=>{const detail=(event as CustomEvent<{id:string}>).detail;if(detail?.id===id)setValue(current=>current===null?1:current+1);};
  window.addEventListener("fm-public-qualified-play",update);
  return()=>window.removeEventListener("fm-public-qualified-play",update);
 },[id]);
 return <span className="fm-song-play-count">{value===null?"—":value.toLocaleString("en-KE")} plays</span>;
}