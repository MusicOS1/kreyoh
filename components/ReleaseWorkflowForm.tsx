'use client';
import {useRef,useState,type ReactNode,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
export default function ReleaseWorkflowForm({id,action,revision=0,label,children,trackId}:{id:string;action:string;revision?:number;label:string;children?:ReactNode;trackId?:string}){
 const router=useRouter(),lock=useRef(false),retry=useRef<{signature:string;requestId:string}|null>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
 const form=new FormData(event.currentTarget);const data:Record<string,unknown>=Object.fromEntries(form);
 if(trackId)data.track_id=trackId;
 if(action==='save'){
  data.featured_artist_ids=form.getAll('featured_artist_ids');data.artwork_authorised=form.has('artwork_authorised');data.explicit=form.has('explicit');
  const date=String(form.get('release_at')||'');data.release_at=date?new Date(date+'+03:00').toISOString():'';
 }
 const signature=JSON.stringify({id,action,revision,data});if(retry.current?.signature!==signature)retry.current={signature,requestId:crypto.randomUUID()};
 try{const response=await fetch('/api/releases/workflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,revision,data,requestId:retry.current.requestId})});const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'Release action failed.');setNotice('Saved.');if(action==='create')router.push('/releases/'+result.id);else router.refresh();}
 catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{lock.current=false;setBusy(false);}}
 return <form onSubmit={submit} className="operations-form" aria-label={label}>{children}<button disabled={busy} aria-busy={busy}>{busy?'Saving…':label}</button>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</form>;
}
