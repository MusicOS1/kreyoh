"use client";

import {Children,useEffect,useRef,useState,type ReactNode} from 'react';

export default function TrackCatalogPages({children,ids}:{children:ReactNode;ids:string[]}) {
 const [page,setPage]=useState(1);
 const container=useRef<HTMLDivElement>(null);
 const items=Children.toArray(children);
 const total=Math.max(1,Math.ceil(items.length/10));
 const current=Math.min(page,total);
 useEffect(()=>{
  function locate(){const id=decodeURIComponent(window.location.hash.slice(1));const index=ids.indexOf(id);if(index>=0)setPage(Math.floor(index/10)+1);}
  locate();window.addEventListener('hashchange',locate);return()=>window.removeEventListener('hashchange',locate);
 },[ids]);
 useEffect(()=>{const id=decodeURIComponent(window.location.hash.slice(1));if(!ids.includes(id))return;const element=document.getElementById(id);if(element instanceof HTMLDetailsElement){element.open=true;element.scrollIntoView({block:'start'});}},[current,ids]);
 function change(next:number){setPage(next);container.current?.scrollIntoView({block:'start',behavior:'smooth'});}
 function pagination(){return <nav className="track-catalog-pagination" aria-label="Track pages"><span role="status">{items.length?`${(current-1)*10+1}–${Math.min(current*10,items.length)} of ${items.length} tracks`:'No tracks'}</span><div><button type="button" disabled={current===1} onClick={()=>change(current-1)}>← Previous</button><label>Page <select aria-label="Track page" value={current} onChange={e=>change(Number(e.target.value))}>{Array.from({length:total},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select> of {total}</label><button type="button" disabled={current===total} onClick={()=>change(current+1)}>Next →</button></div></nav>;}
 return <div ref={container} data-native-catalogue className="track-catalog-pages">{pagination()}<div className="compact-track-catalog">{items.slice((current-1)*10,current*10)}</div>{items.length>10&&pagination()}</div>;
}
