"use client";
import {useEffect} from "react";
const KEY="fm-design-theme";
export default function MusicThemeBoot(){
 useEffect(()=>{
  try{document.documentElement.dataset.fmTheme=localStorage.getItem(KEY)==="light"?"light":"dark"}catch{document.documentElement.dataset.fmTheme="dark"}
  const sync=()=>{const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');if(meta)meta.content=document.documentElement.dataset.fmTheme==="light"?"#ffffff":"#080809"};
  sync();document.addEventListener("fm-theme-changed",sync);
  return()=>document.removeEventListener("fm-theme-changed",sync);
 },[]);
 return null;
}
