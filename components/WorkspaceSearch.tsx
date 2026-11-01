"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
type Result={kind:string;title:string;subtitle:string;href:string};
export default function WorkspaceSearch(){
 const [open,setOpen]=useState(false),[q,setQ]=useState(""),[results,setResults]=useState<Result[]>([]),[loading,setLoading]=useState(false);
 const path=usePathname();
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{
  if(!open||q.trim().length<2){setResults([]);setLoading(false);return}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(()=>{void fetch("/api/workspace-search?q="+encodeURIComponent(q),{signal:controller.signal,cache:"no-store"}).then(r=>r.json()).then(data=>setResults(data.items||[])).catch(()=>setResults([])).finally(()=>setLoading(false))},250);
  return()=>{clearTimeout(timer);controller.abort()};
 },[q,open]);
 return <div className="fm-global-search"><button type="button" className="fm-search-trigger" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>⌕ Search all</button>
 {open&&<section role="search" className="fm-search-results"><label htmlFor="fm-all-search">Artists, tracks, beats and projects</label><input id="fm-all-search" autoFocus type="search" placeholder="Find anything in your music workspace…" value={q} onChange={e=>setQ(e.target.value.slice(0,64))}/>
 {loading&&<p>Searching…</p>}<div className="fm-search-matches">{results.map((r,i)=><Link href={r.href} key={i+r.title} onClick={()=>setOpen(false)}><small>{r.kind}</small><strong>{r.title}</strong><span>{r.subtitle}</span></Link>)}</div>
 {!loading&&q.length>=2&&!results.length&&<p>No matches in public artists or your current project.</p>}
 <button type="button" onClick={()=>setOpen(false)}>Close</button></section>}</div>;
}
