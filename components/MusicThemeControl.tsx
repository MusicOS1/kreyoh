"use client";
import {useEffect,useState} from "react";
export default function MusicThemeControl(){
 const [light,setLight]=useState(false);
 useEffect(()=>{setLight(document.documentElement.dataset.fmTheme==="light")},[]);
 function toggle(){
  const next=!light;setLight(next);
  document.documentElement.dataset.fmTheme=next?"light":"dark";
  try{localStorage.setItem("fm-design-theme",next?"light":"dark")}catch{}
  document.dispatchEvent(new Event("fm-theme-changed"));
 }
 return <button type="button" className="fm-theme-toggle" onClick={toggle} aria-label={light?"Switch to dark FACKTS Music theme":"Switch to white FACKTS Music theme"} title={light?"Dark theme":"White theme"}>{light?"◑ Dark":"◐ Light"}</button>;
}
