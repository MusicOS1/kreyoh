"use client";
import {useState,useRef,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {uploadReleaseFile} from '../lib/releaseRelayUpload';
import ReleaseCreditsEditor, {type CreditDirectoryPerson} from './ReleaseCreditsEditor';
import {prepareReleaseResult,finishReleaseResult,refreshReleaseUploadResult} from '../app/billboard/actions';

const audioTypes:Record<string,string>={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',flac:'audio/flac'};
function fileAudioType(file:File){return audioTypes[file.name.split('.').pop()?.toLowerCase()||'']||'';}
function friendlyError(error:unknown){
 const message=error instanceof Error?error.message:'Submission failed.';
 if(message==='Failed to fetch'||message==='NetworkError when attempting to fetch resource.')
  return 'Connection failed. Your draft is safe; retry the upload without withdrawing the release.';
 return message;
}
async function uploadToR2(id:string,kind:'audio'|'cover',url:string,file:File,type:string,label:string,onProgress:(message:string)=>void){
 await uploadReleaseFile(id,kind,url,file,type,label,onProgress);
}
export default function ReleaseSubmitForm({people}:{people:CreditDirectoryPerson[]}){
 const[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const[recoverable,setRecoverable]=useState(false);
 const[artistName,setArtistName]=useState('');
 const[creditsResetToken,setCreditsResetToken]=useState(0);
 const draft=useRef<{id:string;signature:string}|null>(null);
 const formRef=useRef<HTMLFormElement>(null);
 const router=useRouter();
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setBusy(true);setRecoverable(false);setNotice('');
  try{
   const form=new FormData(event.currentTarget),audio=form.get('audio'),cover=form.get('cover');
   if(!(audio instanceof File)||!audio.size)throw Error('Choose your finished song.');
   const type=fileAudioType(audio);if(!type)throw Error('Choose MP3, WAV, M4A or FLAC.');
   if(audio.size>150*1024*1024)throw Error('Choose audio up to 150 MB.');
   if(cover instanceof File&&cover.size&&(cover.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(cover.type)))
    throw Error('Use a JPG, PNG or WebP cover up to 10 MB.');
   const metadata=new FormData();
   for(const[k,v]of form)if(typeof v==='string')metadata.set(k,v);
   metadata.set('audio_type',type);metadata.set('audio_size',String(audio.size));
   if(cover instanceof File&&cover.size){metadata.set('cover_type',cover.type);metadata.set('cover_size',String(cover.size));}
   const signature=JSON.stringify([...metadata.entries()]);
   let prepared:{id:string;uploadUrl:string;coverUploadUrl:string|null};
   if(draft.current){
    if(draft.current.signature!==signature)throw Error('This incomplete draft already has release details. Keep those details unchanged to retry, or use the recovery option under Your submissions.');
    setNotice('Renewing your upload connection…');
    const refreshed=await refreshReleaseUploadResult(draft.current.id,cover instanceof File?cover.type:'');
    if(!refreshed.ok)throw Error(refreshed.error);
    prepared={id:draft.current.id,...refreshed.value};
   }else{
    setNotice('Preparing upload…');
    const result=await prepareReleaseResult(metadata);
    if(!result.ok)throw Error(result.error);
    prepared=result.value;draft.current={id:prepared.id,signature};
   }
   await uploadToR2(prepared.id,'audio',prepared.uploadUrl,audio,type,'audio',setNotice);
   if(prepared.coverUploadUrl){
    if(!(cover instanceof File)||!cover.size)throw Error('Choose your cover artwork to complete this draft.');
    await uploadToR2(prepared.id,'cover',prepared.coverUploadUrl,cover,cover.type,'cover artwork',setNotice);
   }
   setNotice('Submitting for review…');
   const submitted=await finishReleaseResult(prepared.id);
   if(!submitted.ok)throw Error(submitted.error);
   draft.current=null;formRef.current?.reset();setArtistName('');setCreditsResetToken(value=>value+1);setRecoverable(false);
   setNotice('Submitted for review. Your song will appear after approval and its release date.');
   router.refresh();
  }catch(error){setRecoverable(Boolean(draft.current));setNotice(friendlyError(error));}
  finally{setBusy(false);}
 }
 return <form ref={formRef} className="community-form" onSubmit={submit}>
  <fieldset disabled={busy}><legend>Submit a finished song</legend><p>Public accounts can submit up to 10 songs in 24 hours. Authorised music admins can import up to 100 tracks per batch in the Control Room.</p>
  <label>Song title<input name="title" maxLength={120} required/></label><label>Artist / act name<input name="artist_name" maxLength={100} required value={artistName} onChange={event=>setArtistName(event.target.value)} placeholder="e.g. Mad Meets Crazy"/></label>
  <div className="community-columns"><label>Collection / EP / album (optional)<input name="collection" maxLength={120} placeholder="e.g. Raw Volume 1"/></label><label>Track number<input name="track_number" type="number" min={1} max={100} defaultValue={1}/></label></div>
  <div className="community-columns"><label>Genre<input name="genre" maxLength={60}/></label><label>Release date (Kenya time)<input name="release_at" type="date"/><small>Leave blank to release as soon as approved.</small></label></div>
  <label>About this song<textarea name="description" maxLength={2000}/></label><ReleaseCreditsEditor key={creditsResetToken} people={people} artistName={artistName}/>
  <label>Finished audio · MP3, WAV, M4A or FLAC · max 150 MB<input type="file" name="audio" accept=".mp3,.wav,.m4a,.flac" required/></label>
  <label>Original cover artwork (optional) · JPG, PNG or WebP · max 10 MB<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"/></label>
  <label className="community-check"><input name="debut" type="checkbox" defaultChecked/>This is the song’s first public release.</label>
  <label className="community-check"><input name="explicit" type="checkbox"/>Contains explicit lyrics.</label>
  <label className="community-check"><input name="rights" type="checkbox" required/>I have permission from the relevant rights holders to publish this recording, credits and artwork on FACKTS Music and allow public streaming and fan voting.</label>
  <button disabled={busy}>{busy?'Working…':recoverable?'Retry this upload':'Submit for review'}</button></fieldset>
  {notice&&<p role="status">{notice}</p>}
  {recoverable&&<p>Your draft is retained. You can retry here or resume it under Your submissions. No need to withdraw.</p>}
 </form>;
}

export function ResumeReleaseDraft({id,title,audioType,needsCover}:{id:string;title:string;audioType:string;needsCover:boolean}){
 const[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),router=useRouter();
 const audioRef=useRef<HTMLInputElement>(null),coverRef=useRef<HTMLInputElement>(null);
 async function completeOnly(){
  if(busy)return;setBusy(true);setNotice('Checking the existing upload…');
  try{
   const result=await finishReleaseResult(id);
   if(!result.ok)throw Error(result.error);
   setNotice('Submitted for review.');router.refresh();
  }catch(error){setNotice('Could not complete the existing upload: '+friendlyError(error)+' Select the files below to retry.');}
  finally{setBusy(false);}
 }
 async function retryFiles(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const audio=audioRef.current?.files?.[0],cover=coverRef.current?.files?.[0];
  if(!audio||!audio.size){setNotice('Choose the audio file for this draft.');return;}
  if(fileAudioType(audio)!==audioType){setNotice('Select the original '+audioType+' audio format for this draft.');return;}
  if(audio.size>150*1024*1024){setNotice('Choose audio up to 150 MB.');return;}
  if(needsCover&&(!cover||!['image/jpeg','image/png','image/webp'].includes(cover.type)||cover.size>10*1024*1024)){
   setNotice('Choose the original JPG, PNG or WebP cover (max 10 MB).');return;
  }
  setBusy(true);
  try{
   setNotice('Renewing upload links…');
   const result=await refreshReleaseUploadResult(id,cover?.type||'');
   if(!result.ok)throw Error(result.error);
   await uploadToR2(id,'audio',result.value.uploadUrl,audio,audioType,'audio',setNotice);
   if(result.value.coverUploadUrl&&cover)await uploadToR2(id,'cover',result.value.coverUploadUrl,cover,cover.type,'cover artwork',setNotice);
   setNotice('Submitting for review…');
   const finished=await finishReleaseResult(id);
   if(!finished.ok)throw Error(finished.error);
   setNotice('Submitted for review.');router.refresh();
  }catch(error){setNotice(friendlyError(error));}
  finally{setBusy(false);}
 }
 return <section aria-label={'Resume '+title} className="community-form">
  <p>The upload for this draft was interrupted. Keep the existing release; do not withdraw it.</p>
  <button type="button" onClick={()=>void completeOnly()} disabled={busy}>Complete existing upload</button>
  <form onSubmit={retryFiles}>
   <label>Audio file for this draft<input ref={audioRef} type="file" accept=".mp3,.wav,.m4a,.flac" required/></label>
   {needsCover&&<label>Cover artwork for this draft<input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" required/></label>}
   <button disabled={busy}>{busy?'Working…':'Retry files and submit'}</button>
  </form>
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
