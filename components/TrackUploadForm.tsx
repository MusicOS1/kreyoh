'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {productionFileError,PRODUCTION_KINDS} from '../lib/productionPolicy';
import {clearProductionRecovery,productionUploadRequest,transferProductionFile} from '../lib/productionTransfer';

export default function TrackUploadForm({trackId}:{trackId:string}) {
 const router=useRouter();const formRef=useRef<HTMLFormElement>(null);const controller=useRef<AbortController|null>(null);
 const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);const [error,setError]=useState('');const [message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);const file=data.get('track_file');
  if(!(file instanceof File)){setError('Choose a production file.');return;}
  const kind=String(data.get('asset_kind'));const issue=productionFileError(file.name,file.type||'application/octet-stream',file.size,kind);
  if(issue){setError(issue);return;}
  setBusy(true);setError('');setMessage('Preparing or recovering your secure transfer…');
  const storageKey='fackts-production-transfer-v1:'+trackId;
  try{
   // Metadata only; no signed URLs, credentials or file bytes are persisted.
   const signature=JSON.stringify([file.name,file.size,file.lastModified,kind,String(data.get('version_note')||'')]);
   let saved:{id:string;signature:string}|null=null;
   try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
   if(saved&&saved.signature!==signature)throw new Error('Another transfer is saved for this track. Reselect its original file and settings to resume, or discard it first.');
   if(!saved){const result=await productionUploadRequest({action:'start',trackId,name:file.name,type:file.type||'application/octet-stream',size:file.size,kind,note:data.get('version_note')});saved={id:result.id!,signature};localStorage.setItem(storageKey,JSON.stringify(saved));}
   controller.current=new AbortController();setMessage('Uploading directly to private storage. Other controls remain available.');
   await transferProductionFile(file,saved.id,setProgress,controller.current.signal);
   clearProductionRecovery(trackId);formRef.current?.reset();setMessage('Version saved. It starts in progress and needs its own review.');router.refresh();
  }catch(cause){setMessage('');setError(cause instanceof Error?cause.message:'Upload failed. Reselect the same file to resume.');}
  finally{setBusy(false);controller.current=null;}
 }
 async function discard(){
  if(busy)return;const storageKey='fackts-production-transfer-v1:'+trackId;
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved)await productionUploadRequest({action:'abort',id:saved.id});localStorage.removeItem(storageKey);setError('');setMessage('Saved transfer cleared.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not discard this transfer.');}
 }
 return <form ref={formRef} onSubmit={submit} className="track-upload-form">
  <div className="track-upload-intro"><strong>Add a production version</strong><span>Audio, stems, visual deliverables and documents up to 20 GiB. Transfers go directly to private storage in resumable parts. Reselect the same file and settings after reopening this tab. Earlier versions stay intact.</span></div>
  <div className="track-upload-fields"><label>File type<select name="asset_kind" defaultValue="demo" disabled={busy}>{PRODUCTION_KINDS.map(kind=><option key={kind} value={kind}>{kind.replaceAll('_',' ')}</option>)}</select></label>
  <label>Production file<input name="track_file" type="file" required disabled={busy} accept="audio/*,.zip,.pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov"/></label>
  <label className="track-version-note-field">Version note<input name="version_note" maxLength={280} disabled={busy} placeholder="What changed in this version?"/></label>
  <button disabled={busy}>{busy?'Transferring…':'Upload / resume version'}</button>
  {busy?<button type="button" onClick={()=>controller.current?.abort()}>Pause transfer</button>:<button type="button" onClick={discard}>Discard saved transfer</button>}</div>
  {busy&&<progress value={progress} max={100} aria-label="File upload progress"/>}{error&&<p role="alert" className="form-error-alert">{error}</p>}{message&&<p role="status" className="form-success-alert">{message}</p>}
 </form>;
}
