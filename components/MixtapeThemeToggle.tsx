"use client";
import {useEffect,useState} from "react";

type Theme="light"|"dark";
const STORAGE_KEY="fackts-mixtape-appearance";
function getSaved():Theme{
 try{return localStorage.getItem(STORAGE_KEY)==="dark"?"dark":"light";}catch{return "light";}
}
export default function MixtapeThemeToggle(){
 const [theme,setTheme]=useState<Theme>("light");
 useEffect(()=>{
   const saved=getSaved();setTheme(saved);document.documentElement.dataset.fmMixtape=saved;
   const onStorage=(event:StorageEvent)=>{if(event.key===STORAGE_KEY){const next=getSaved();setTheme(next);document.documentElement.dataset.fmMixtape=next;}};
   window.addEventListener("storage",onStorage);
   return()=>window.removeEventListener("storage",onStorage);
 },[]);
 function change(value:Theme){
   setTheme(value);document.documentElement.dataset.fmMixtape=value;
   try{localStorage.setItem(STORAGE_KEY,value);}catch{}
 }
 return <div className="fm-mixtape-theme" role="group" aria-label="FACKTS Music appearance">
   <button type="button" aria-label="Use light appearance" aria-pressed={theme==="light"} onClick={()=>change("light")}>☼ <span>Light</span></button>
   <button type="button" aria-label="Use dark appearance" aria-pressed={theme==="dark"} onClick={()=>change("dark")}>☾ <span>Dark</span></button>
 </div>;
}
