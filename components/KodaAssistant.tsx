"use client";
import {useState} from "react";
import Link from "next/link";
import {MUSIC_HELP,guideAnswer} from "../lib/musicHelp";
export default function KodaAssistant(){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 const answer=query.trim()?guideAnswer(query):null;
 return <aside className="fm-koda-shell" aria-label="KODA music guide">
  {open&&<section className="fm-koda-panel" aria-label="KODA assistant">
   <header><div><span>FACKTS MUSIC GUIDE</span><h3>KODA</h3></div><button type="button" aria-label="Close KODA" onClick={()=>setOpen(false)}>×</button></header>
   <p>Find a song, a beat, a project or your next step.</p>
   <label htmlFor="fm-koda-ask">What are you looking for?</label>
   <input id="fm-koda-ask" value={query} onChange={event=>setQuery(event.target.value.slice(0,180))} placeholder="e.g. How do splits work?"/>
   {answer?<div className="fm-koda-answer"><p>{answer.answer}</p>{answer.links.map(l=><Link href={l.href} key={l.href} onClick={()=>setOpen(false)}>{l.title} ↗</Link>)}</div>:
    <div className="fm-koda-shortcuts">{MUSIC_HELP.slice(0,4).map(t=><button key={t.title} type="button" onClick={()=>setQuery(t.title)}>{t.title} ↗</button>)}</div>}
   <Link className="fm-koda-help" href="/help" onClick={()=>setOpen(false)}>Open full guide ↗</Link><small>KODA provides navigation guidance. Private project data stays in your workspace.</small>
  </section>}
  <button className="fm-koda-launch" aria-expanded={open} aria-label={open?"Close KODA guide":"Ask KODA music guide"} onClick={()=>setOpen(x=>!x)}>♫ {open?"Close":"Ask KODA"}</button>
 </aside>;
}
