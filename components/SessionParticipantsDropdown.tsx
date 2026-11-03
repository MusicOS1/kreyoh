"use client";

import {useEffect,useId,useMemo,useRef,useState} from "react";

type Participant={id:string;name:string};

/**
 * Click-to-select participants. Selected people appear as removable name tags
 * above the searchable dropdown. Hidden inputs persist while the menu is closed,
 * so existing studio-session server actions receive the same FormData shape.
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
 const byId=useMemo(()=>new Map(options.map(person=>[person.id,person.name])),[options]);
 const chosen=useMemo(()=>selected.filter(id=>byId.has(id)),[selected,byId]);
 const visible=useMemo(()=>{
  const term=query.trim().toLocaleLowerCase();
  return options.filter(person=>person.name.toLocaleLowerCase().includes(term));
 },[options,query]);

 useEffect(()=>{
  if(!open)return;
  const handleOutside=(event:PointerEvent)=>{
   if(root.current&&!root.current.contains(event.target as Node))setOpen(false);
  };
  const handleKeys=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>(".session-participants-trigger")?.focus();
   }
  };
  document.addEventListener("pointerdown",handleOutside);
  document.addEventListener("keydown",handleKeys);
  search.current?.focus();
  return ()=>{
   document.removeEventListener("pointerdown",handleOutside);
   document.removeEventListener("keydown",handleKeys);
  };
 },[open]);

 function toggle(id:string){
  setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
 }
 function remove(id:string){
  setSelected(current=>current.filter(x=>x!==id));
 }

 return <div className="session-participants-field" ref={root}>
  <span className="session-participants-label">{label}</span>
  {/* Do not rely on mounted/checked options: the dropdown can be closed. */}
  {chosen.map(id=><input type="hidden" name="participants" value={id} key={id}/>)}

  {chosen.length>0&&<div className="session-participants-tags" role="group" aria-label="Selected participants">
   {chosen.map(id=><span className="session-participants-tag" key={id}>
    <span className="session-participants-tag-name">{byId.get(id)}</span>
    <button type="button" className="session-participants-remove"
     aria-label={"Remove "+byId.get(id)+" from participants"}
     onClick={()=>remove(id)} title={"Remove "+byId.get(id)}>×</button>
   </span>)}
  </div>}

  <div className="session-participants-picker">
   <button type="button" className="session-participants-trigger" aria-expanded={open}
    aria-controls={menuId} onClick={()=>{setOpen(value=>!value);setQuery("");}}>
    <span className="session-participants-trigger-text">
     {chosen.length===0?"Select participants":"Add more participants"}
    </span>
    <span className="session-participants-chevron" aria-hidden="true">{open?"▴":"▾"}</span>
   </button>
   {open&&<div id={menuId} className="session-participants-panel">
    <div className="session-participants-search-wrap">
     <input ref={search} aria-label="Search project participants" type="search" value={query}
      onChange={event=>setQuery(event.target.value)}
      placeholder="Search project members..." autoComplete="off"/>
    </div>
    <div className="session-participants-options" role="listbox"
     aria-label="Project participants" aria-multiselectable="true">
     {visible.length===0?<p className="session-participants-no-results">
      {options.length===0?"No project members to select.":"No matching project members."}
     </p>:visible.map(member=><button type="button" role="option" key={member.id}
      className={"session-participants-option"+(selectedSet.has(member.id)?" is-selected":"")}
      aria-selected={selectedSet.has(member.id)} onClick={()=>toggle(member.id)}>
      <span className="session-participants-option-name">{member.name}</span>
      {selectedSet.has(member.id)&&<span className="session-participants-selected-mark" aria-hidden="true">✓</span>}
     </button>)}
    </div>
   </div>}
  </div>
 </div>;
}
