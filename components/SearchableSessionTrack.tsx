"use client";

import {useEffect, useId, useMemo, useRef, useState} from "react";

type TrackOption = {id:string; title:string};

/**
 * Sends the original track_id to the existing createSession action.
 * A typed query is never mistaken for a valid track ID.
 */
export default function SearchableSessionTrack({options}:{options:TrackOption[]}) {
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState("");
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const listId=useId();
  const visible=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase();
    return options.filter(item=>item.title.toLocaleLowerCase().includes(term)).slice(0,80);
  },[query,options]);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{
      if(root.current&&!root.current.contains(event.target as Node))setOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  function choose(item:TrackOption) {setSelected(item.id);setQuery(item.title);setOpen(false);}
  function clear(){setSelected("");setQuery("");setOpen(false);}
  return <div className="session-track-picker" ref={root}>
    <label htmlFor={listId+"-search"}>Related track (optional)</label>
    <input type="hidden" name="track_id" value={selected}/>
    <div className="session-track-search">
      <input
        id={listId+"-search"}
        type="search"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        value={query}
        placeholder="Search tracks, or leave project-wide"
        onFocus={()=>setOpen(true)}
        onChange={event=>{setQuery(event.target.value);setSelected("");setOpen(true);}}
      />
      {(query||selected)&&<button type="button" onClick={clear} aria-label="Clear selected track">Clear</button>}
    </div>
    {open&&<div id={listId} role="listbox" className="session-track-options" aria-label="Matching project tracks">
      {visible.length?visible.map(item=><button key={item.id} type="button" role="option" aria-selected={selected===item.id} onClick={()=>choose(item)}>{item.title}</button>):
        <p>No matching tracks. Clear the search to make this project-wide.</p>}
    </div>}
  </div>;
}
