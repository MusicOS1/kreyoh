"use client";
import {useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {prepareRelease,finishRelease} from '../app/billboard/actions';
export default function ReleaseSubmitForm(){
 const[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const ref=useRef<HTMLFormElement>(null);const router=useRouter();
 return <form ref={ref} className="community-form" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setNotice('');try{
 const form=new FormData(e.currentTarget),audio=form.get('audio'),cover=form.get('cover');if(!(audio instanceof File)||!audio.size)throw Error('Choose your finished song.');
 const metadata=new FormData();for(const[k,v]of form)if(typeof v==='string')metadata.set(k,v);
 const ext=audio.name.split('.').pop()?.toLowerCase();const type=({mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',flac:'audio/flac'} as Record<string,string>)[ext||''];
 if(!type)throw Error('Choose MP3, WAV, M4A or FLAC.');metadata.set('audio_type',type);metadata.set('audio_size',String(audio.size));
 if(cover instanceof File&&cover.size){metadata.set('cover_type',cover.type);metadata.set('cover_size',String(cover.size));}
 setNotice('Preparing upload…');const draft=await prepareRelease(metadata);setNotice('Uploading audio…');
 const response=await fetch(draft.uploadUrl,{method:'PUT',headers:{'Content-Type':type},body:audio});if(!response.ok)throw Error('Audio upload failed. Please try again.');
 if(draft.coverUploadUrl&&cover instanceof File){setNotice('Uploading cover…');const response=await fetch(draft.coverUploadUrl,{method:'PUT',headers:{'Content-Type':cover.type},body:cover});if(!response.ok)throw Error('Cover upload failed. Please try again.');}
 setNotice('Submitting for review…');await finishRelease(draft.id);ref.current?.reset();setNotice('Submitted. Your song will appear publicly after approval and its release date.');router.refresh();
 }catch(error){setNotice(error instanceof Error?error.message:'Submission failed. Please try again.');}finally{setBusy(false);}}}>
 <fieldset disabled={busy}><legend>Submit a finished song</legend><p>Public accounts can submit up to 10 songs in 24 hours. Authorised music admins can import up to 100 tracks per batch in the Control Room.</p>
 <label>Song title<input name="title" maxLength={120} required/></label><label>Artist / act name<input name="artist_name" maxLength={100} required placeholder="e.g. Mad Meets Crazy"/></label>
 <div className="community-columns"><label>Collection / EP / album (optional)<input name="collection" maxLength={120} placeholder="e.g. Raw Volume 1"/></label><label>Track number<input name="track_number" type="number" min={1} max={100} defaultValue={1}/></label></div>
 <div className="community-columns"><label>Genre<input name="genre" maxLength={60}/></label><label>Release date (Kenya time)<input name="release_at" type="date"/><small>Leave blank to release as soon as approved.</small></label></div>
 <label>About this song<textarea name="description" maxLength={2000}/></label><label>Credits<textarea name="credits" maxLength={2000} placeholder="Artists, writers, producers, mixing and mastering" required/></label>
 <label>Finished audio · MP3, WAV, M4A or FLAC · max 150 MB<input type="file" name="audio" accept=".mp3,.wav,.m4a,.flac" required/></label>
 <label>Original cover artwork (optional) · JPG, PNG or WebP · max 10 MB<input type="file" name="cover" accept="image/jpeg,image/png,image/webp"/></label>
 <label className="community-check"><input name="debut" type="checkbox" defaultChecked/>This is the song’s first public release.</label>
 <label className="community-check"><input name="explicit" type="checkbox"/>Contains explicit lyrics.</label>
 <label className="community-check"><input name="rights" type="checkbox" required/>I have permission from the relevant rights holders to publish this recording, credits and artwork on FACKTS Music and allow public streaming and fan voting.</label>
 <button>{busy?'Working…':'Submit for review'}</button></fieldset>{notice&&<p role="status">{notice}</p>}
 </form>;
}
