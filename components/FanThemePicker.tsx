"use client";

import {useEffect,useRef,useState} from "react";

type FanTheme="obsidian"|"ivory"|"afterhours";
const themes:{id:FanTheme;label:string;description:string}[]=[
  {id:"obsidian",label:"Obsidian",description:"Signature dark"},
  {id:"ivory",label:"Ivory",description:"Warm daylight"},
  {id:"afterhours",label:"Afterhours",description:"Low light studio"},
];
const storageKey="fackts-fan-theme";
function valid(value:string|null):FanTheme{
  return themes.some(theme=>theme.id===value)?value as FanTheme:"obsidian";
}
function applyTheme(theme:FanTheme){
  document.documentElement.dataset.facktsFanTheme=theme;
}

export default function FanThemePicker({compact=false}:{compact?:boolean}){
  const [theme,setTheme]=useState<FanTheme>("obsidian");
  const details=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    const stored=valid(window.localStorage.getItem(storageKey));
    setTheme(stored);applyTheme(stored);
    const onStorage=(event:StorageEvent)=>{
      if(event.key===storageKey){const next=valid(event.newValue);setTheme(next);applyTheme(next);}
    };
    window.addEventListener("storage",onStorage);
    return ()=>window.removeEventListener("storage",onStorage);
  },[]);
  function choose(next:FanTheme){
    setTheme(next);
    applyTheme(next);
    try{window.localStorage.setItem(storageKey,next);}catch{}
    if(details.current)details.current.open=false;
  }
  return <details className={"fan-theme-picker"+(compact?" fan-theme-compact":"")} ref={details}>
    <summary aria-label="Choose fan portal appearance"><span className="fan-theme-mark" aria-hidden="true">◐</span><span className="fan-theme-label">Appearance</span></summary>
    <div className="fan-theme-menu" role="group" aria-label="Portal themes">
      <strong>Make it yours</strong>
      <small>Choose your listening atmosphere</small>
      {themes.map(item=><button type="button" key={item.id} className="fan-theme-option" onClick={()=>choose(item.id)} aria-pressed={theme===item.id}>
        <span className={"fan-theme-swatch fan-theme-swatch-"+item.id} aria-hidden="true"/>
        <span><b>{item.label}</b><small>{item.description}</small></span>
        {theme===item.id&&<span className="fan-theme-selected" aria-hidden="true">✓</span>}
      </button>)}
    </div>
  </details>;
}
