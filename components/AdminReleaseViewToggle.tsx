"use client";
import {useEffect,useState,type ReactNode} from "react";

type ViewMode="list"|"grid";
const preferenceKey="fackts-admin-release-view";

export default function AdminReleaseViewToggle({children,count}:{children:ReactNode;count:number}){
 const [view,setView]=useState<ViewMode>("list");
 useEffect(()=>{
  try {
   const stored=window.localStorage.getItem(preferenceKey);
   if(stored==="grid"||stored==="list")setView(stored);
  }catch{ /* Reading preferences must never stop release management. */ }
 },[]);
 function chooseView(value:ViewMode){
  setView(value);
  try{window.localStorage.setItem(preferenceKey,value);}catch{ /* Private browsing still works. */ }
 }
 return <section className={"fm-release-browser fm-release-view-"+view} aria-label="Release management results">
  <div className="fm-release-toolbar">
   <p>{count} release{count===1?"":"s"} on this page <span>· Select a release to review or edit</span></p>
   <div className="fm-release-view-buttons" role="group" aria-label="Release display">
    <button type="button" aria-pressed={view==="list"} onClick={()=>chooseView("list")}><span aria-hidden="true">☷</span> List</button>
    <button type="button" aria-pressed={view==="grid"} onClick={()=>chooseView("grid")}><span aria-hidden="true">▦</span> Grid</button>
   </div>
  </div>
  <div className="fm-release-items">{children}</div>
 </section>;
}
