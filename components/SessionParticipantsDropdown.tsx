"use client";

import {useEffect,useId,useMemo,useRef,useState} from "react";

type Participant={id:string;name:string};

/**
 * A compact, searchable multi-select that posts ordinary repeated
 * "participants" fields, so both existing server actions keep working.
 */
export default function SessionParticipantsDropdown({options,label="Participants"}:{
 options:Participant[];label?:string;
}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState<string[]>([]);
 const root=useRef<HTMLDivElement>(null);
 const search=useRef<HTMLInputElement>(null);
 const menuId=useId();
 const selectedSet=useMemo(()=>new Set(selected),[selected]);
 const visible=useMemo(()=>options.filter(option=>option.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),[options,query]);
 const selectedNames=useMemo(()=>options.filter(o=>selectedSet.has(o.id)).map(o=>o.name),[options,selectedSet]);
 useEffect(()=>{
  if(!open)return;
  const handlePointer=(e:PointerEvent)=>{
   if(root.current&&!root.current.contains(e.target as Node))setOpen(false);
  };
  const handleKeys=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){setOpen(false);root.current?.querySelector<HTMLButtonElement>(".session-participants-trigger")?.focus();}
  };
  document.addEventListener("pointerdown",handlePointer);
  document.addEventListener("keydown",handleKeys);
  search.current?.focus();
  return ()=>{document.removeEventListener("pointerdown",handlePointer);document.removeEventListener("keydown",handleKeys);};
 },[open]);
 function toggle(id:string,checked:boolean){
  setSelected(prev=>checked?[...prev.filter(v=>v!==id),id]:prev.filter(v=>v!==id));
 }
 return <div className="session-participants-field" ref={root}>
  <span className="session-participants-label">{label}</span>
  {selected.map(id=><input type="hidden" name="participants" value={id} key={id}/>)}
  <div className="session-participants-picker">
   <button type="button" className="session-participants-trigger" aria-expanded={open} aria-controls={menuId}
    onClick={()=>{setOpen(v=>!v);setQuery("");}}>
    <span className="session-participants-trigger-text">
     {selected.length===0?"Select participants":selected.length===1?selectedNames[0]||"1 participant selected":selected.length+" participants selected"}
    </span><span className="session-participants-chevron" aria-hidden="true">{open?"▴":"▾"}</span>
   </button>
   {open&&<div id={menuId} className="session-participants-panel" role="group" aria-label="Choose session participants">
    <div className="session-participants-search-wrap">
     <input ref={search} aria-label="Search project participants" type="search" value={query}
      onChange={e=>setQuery(e.target.value)} placeholder="Search project members..." autoComplete="off"/>
    </div>
    <div className="session-participants-options">
     {visible.length===0?<p className="session-participants-no-results">
      {options.length===0?"No project members to select.":"No matching project members."}
     </p>:visible.map(member=><label className="session-participants-option" key={member.id}>
      <input type="checkbox" value={member.id}
       checked={selectedSet.has(member.id)} onChange={e=>toggle(member.id,e.target.checked)}/>
      <span>{member.name}</span>
     </label>)}
    </div>
    <div className="session-participants-footer">
     <span>{selected.length} selected</span>
     {selected.length>0&&<button type="button" onClick={()=>setSelected([])}>Clear</button>}
     <button type="button" className="session-participants-done" onClick={()=>setOpen(false)}>Done</button>
    </div>
   </div>}
  </div>
  {selected.length>0&&<span className="session-participants-hint" aria-live="polite">
   {selected.length<=3?selectedNames.join(", "):selected.length+" project members selected"}
  </span>}
 </div>;
}
