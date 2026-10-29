'use client';
import {useRef,useState,useTransition,type FormEvent,type ReactNode} from 'react';
import styles from './ProductionActionForm.module.css';
import {useRouter} from 'next/navigation';
export default function ProductionActionForm({action,target,revision=0,label,children}:{action:string;target:string;revision?:number;label:string;children?:ReactNode}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [error,setError]=useState('');const [,startTransition]=useTransition();
 const retry=useRef<{signature:string;id:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  const data=Object.fromEntries(new FormData(event.currentTarget));const signature=JSON.stringify({action,target,revision,data});
  if(retry.current?.signature!==signature)retry.current={signature,id:crypto.randomUUID()};
  try{const response=await fetch('/api/production/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,target,revision,data,requestId:retry.current.id})});const result=await response.json();if(!response.ok||result.error)throw new Error(result.error||'Action failed.');setNotice('Saved to the project history.');startTransition(()=>router.refresh());}
  catch(cause){setError(cause instanceof Error?cause.message:'Could not save this action.');}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className={`operations-form ${styles.form}`} aria-label={label}>{children}<button disabled={busy} aria-busy={busy}>{busy?'Saving…':label}</button>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</form>;
}
