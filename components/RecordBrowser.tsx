'use client';
import {Children,useEffect,useRef,useState,type ReactNode} from 'react';
import styles from './RecordBrowser.module.css';
export type BrowserRecord={id:string;title:string;code?:string;status?:string;date?:string};
export default function RecordBrowser({items,children,label='records',timeFilter=false}:{items:BrowserRecord[];children:ReactNode;label?:string;timeFilter?:boolean}){
 const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[time,setTime]=useState('all'),[sort,setSort]=useState('original'),[page,setPage]=useState(0);
 const revealedHash=useRef<string|null>(null);
 const root=useRef<HTMLDivElement>(null);const nodes=Children.toArray(children);
 const matches=items.map((row,index)=>({...row,index})).filter(row=>`${row.title} ${row.code||''}`.toLowerCase().includes(query.trim().toLowerCase())&&(status==='all'||row.status===status)&&(time==='all'||(time==='past'?new Date(row.date||'').getTime()<Date.now():new Date(row.date||'').getTime()>=Date.now())));
 matches.sort((a,b)=>sort==='title'?String(a.title||'').localeCompare(String(b.title||'')):sort==='oldest'?String(a.date||'').localeCompare(String(b.date||'')):sort==='newest'?String(b.date||'').localeCompare(String(a.date||'')):a.index-b.index);
 const pages=Math.max(1,Math.ceil(matches.length/10)),current=Math.min(page,pages-1),shown=new Set(matches.slice(current*10,current*10+10).map(row=>row.index));
 const statuses=[...new Set(items.map(row=>row.status).filter(Boolean))] as string[];
 useEffect(()=>{function reveal(){let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(revealedHash.current===id)return;const element=document.getElementById(id);const index=items.findIndex(row=>row.id===id||document.getElementById(row.id)?.contains(element));if(index<0)return;revealedHash.current=id;setQuery('');setStatus('all');setTime('all');setSort('original');setPage(Math.floor(index/10));for(let node:HTMLElement|null=element;node;node=node.parentElement)if(node instanceof HTMLDetailsElement)node.open=true;requestAnimationFrame(()=>element?.scrollIntoView({block:'start'}));}reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);},[items]);
 const matchedIndexes=new Set(matches.map(row=>row.index));
 const ordered=[...matches.map(row=>row.index),...items.map((_,i)=>i).filter(i=>!matchedIndexes.has(i))];
 const reset=()=>{setQuery('');setStatus('all');setTime('all');setPage(0);};
 return <div className={styles.root} ref={root} data-native-catalogue>
  <div className={styles.tools}><label>Search {label}<input type="search" placeholder="Title or code" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label>
  {!!statuses.length&&<label>Status<select aria-label={`Filter ${label} by status`} value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label>}
  {timeFilter&&<label>When<select aria-label="Session dates" value={time} onChange={e=>{setTime(e.target.value);setPage(0);}}><option value="all">All dates</option><option value="past">Past</option><option value="upcoming">Upcoming</option></select></label>}
  <label>Sort<select aria-label={`Sort ${label}`} value={sort} onChange={e=>{setSort(e.target.value);setPage(0);}}><option value="original">Default order</option><option value="title">Title A–Z</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
  <p className={styles.count} role="status">{matches.length} of {items.length} {label} · Page {current+1} of {pages}</p>
  {!matches.length&&<p>{items.length?'No matching records.':'No records available.'} {items.length>0&&<button type="button" onClick={reset}>Clear filters</button>}</p>}
  <div className={styles.rows}>{ordered.map(index=><div key={items[index]?.id||index} hidden={!shown.has(index)}>{nodes[index]}</div>)}</div>
  {matches.length>10&&<nav className={styles.pages} aria-label={`${label} pages`}><button type="button" disabled={!current} onClick={()=>setPage(current-1)}>Previous</button><span>Page {current+1} of {pages}</span><button type="button" disabled={current+1===pages} onClick={()=>setPage(current+1)}>Next</button></nav>}
 </div>;
}
