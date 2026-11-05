"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {directUpload} from "../lib/directUpload";
import {prepareAdminAudioReplacement,finishAdminAudioReplacement} from "../app/admin/(control)/releases/replaceActions";

const mime:Record<string,string>={mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",flac:"audio/flac"};
export default function AdminReleaseAudioReplacement({releaseId,title,linked=false}:{releaseId:string;title:string;linked?:boolean}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[notice,setNotice]=useState("");
 const formRef=useRef<HTMLFormElement>(null);
 const router=useRouter();
 if(linked)return <p className="bulk-info">For this project-linked release, upload and approve a revised master in the project release workflow. This protects approved credits and splits.</p>;
 async function upload(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const form=event.currentTarget;const file=form.querySelector<HTMLInputElement>('input[name="replacement_file"]')?.files?.[0];
  if(!file){setNotice("Choose replacement audio.");return;}
  const extension=file.name.split(".").pop()?.toLowerCase()||"";
  const contentType=mime[extension];
  if(!contentType||!file.size||file.size>150*1024*1024){setNotice("Select MP3, WAV, M4A or FLAC audio up to 150 MB.");return;}
  setBusy(true);setProgress(0);setNotice("Preparing a secure replacement…");
  try{
   const data=new FormData(form);
   // Keep the master file in the direct-to-R2 upload, never the server-action payload.
   data.delete("replacement_file");
   data.set("release_id",releaseId);data.set("file_name",file.name);data.set("file_size",String(file.size));
   const prepared=await prepareAdminAudioReplacement(data);
   if(!prepared.ok)throw Error(prepared.error);
   setNotice("Uploading the new master (the live song is still unchanged)…");
   await directUpload(prepared.value.uploadUrl,file,prepared.value.audioType,setProgress);
   setNotice("Verifying the new recording and switching the live master…");
   const result=await finishAdminAudioReplacement(releaseId,prepared.value.attemptId);
   if(!result.ok)throw Error(result.error);
   setNotice(result.value.message);
   formRef.current?.reset();setProgress(100);router.refresh();
  }catch(error){setNotice(error instanceof Error?error.message:"The replacement did not finish. The existing audio remains in place.");}
  finally{setBusy(false);}
 }
 return <details className="control-release-replacement">
  <summary>Replace recording (keep song data)</summary>
  <form ref={formRef} onSubmit={upload}>
   <p>Use this when the wrong master was uploaded or a newer mix is approved. The song keeps its URL, votes, comments, credits, artwork and statistics. The previous master stays in secure storage.</p>
   <label>Replacement master for <strong>{title}</strong>
    <input name="replacement_file" type="file" accept=".mp3,.wav,.m4a,.flac" disabled={busy} required/>
   </label>
   <label>Reason for changing this recording
    <textarea name="reason" minLength={12} maxLength={500} required placeholder="e.g. Replace the wrong export with the approved final mix" disabled={busy}/>
   </label>
   <label className="community-check"><input name="rights" type="checkbox" disabled={busy} required/> I confirm rights-holder approval for the replacement recording.</label>
   <button type="submit" disabled={busy}>{busy?"Updating recording…":"Verify and replace audio"}</button>
   {busy&&<progress max={100} value={progress} aria-label="New audio upload progress"/>}
   {notice&&<p role="status">{notice}</p>}
  </form>
 </details>;
}
