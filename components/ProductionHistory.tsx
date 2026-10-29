'use client';
import {useRef,useState} from 'react';
type Event={id:string;event_name:string;created_at:string;metadata?:{input?:{note?:string}}};
export default function ProductionHistory({assetId,initial}:{assetId:string;initial:Event[]}){
 const [rows,setRows]=useState(initial),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[next,setNext]=useState<{at:string;id:string}|null>(null);const lock=useRef(false);
 async function load(earlier=false){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const params=new URLSearchParams({asset:assetId});if(earlier&&next){params.set('after',next.at);params.set('after_id',next.id);}
   const response=await fetch('/api/production/actions?'+params,{cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Decision history unavailable.');
   setRows(old=>earlier?[...old,...result.rows]:result.rows);setNext(result.next);setLoaded(true);
  }catch(cause){setError(cause instanceof Error?cause.message:'Decision history unavailable.');}finally{setBusy(false);lock.current=false;}
 }
 return <details onToggle={e=>{if(e.currentTarget.open&&!loaded)void load();}}><summary>Version decision history</summary>
  <ol>{rows.map(event=><li key={event.id}>{event.event_name.replace('production_','').replaceAll('_',' ')} · {new Date(event.created_at).toISOString().slice(0,16).replace('T',' ')} UTC{event.metadata?.input?.note?` · ${event.metadata.input.note}`:''}</li>)}</ol>
  {loaded&&!rows.length&&<p>No review decisions yet.</p>}{busy&&<p role="status">Loading decisions…</p>}{error&&<p role="alert">{error}</p>}
  {(next||error)&&<button type="button" disabled={busy} onClick={()=>void load(loaded&&!!next)}>{error?'Retry decision history':'Load earlier decisions'}</button>}
 </details>;
}
