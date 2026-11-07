"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {uploadAdminCoverWithFallback} from "../lib/adminCoverUpload";
import {prepareAdminCoverReplacement,finishAdminCoverReplacement} from "../app/admin/(control)/releases/coverActions";

const fileTypes:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
export default function AdminReleaseCoverReplacement({releaseId,linked=false}:{releaseId:string;linked?:boolean}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[notice,setNotice]=useState("");
 const form=useRef<HTMLFormElement>(null),router=useRouter();
 if(linked)return <p className="fm-release-editor-note">For a project-linked release, replace cover artwork through the approved project release revision. This protects its existing sign-offs.</p>;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const node=event.currentTarget,file=node.querySelector<HTMLInputElement>('input[name="cover_file"]')?.files?.[0];
  if(!file){setNotice("Choose the corrected cover artwork.");return;}
  const ext=file.name.split(".").pop()?.toLowerCase()||"";
  if(!fileTypes[ext]||file.size<1||file.size>10*1024*1024){setNotice("Choose JPG, PNG or WebP up to 10 MB.");return;}
  setBusy(true);setProgress(0);setNotice("Authorising cover replacement…");
  try{
   const payload=new FormData(node);
   // Never send the image bytes through a Server Action; the browser uploads directly to R2.
   payload.delete("cover_file");
   payload.set("release_id",releaseId);payload.set("file_name",file.name);payload.set("file_size",String(file.size));
   const prepared=await prepareAdminCoverReplacement(payload);
   if(!prepared.ok)throw Error(prepared.error);
   setNotice("Uploading the corrected artwork…");
   await uploadAdminCoverWithFallback({
    releaseId,attemptId:prepared.value.attemptId,uploadUrl:prepared.value.uploadUrl,
    file,type:prepared.value.contentType,onProgress:setProgress,
    onFallback:()=>setNotice("Direct storage upload blocked. Using secure FACKTS upload instead…")
   });
   setNotice("Verifying and applying the artwork…");
   const finished=await finishAdminCoverReplacement(releaseId,prepared.value.attemptId);
   if(!finished.ok)throw Error(finished.error);
   setNotice(finished.value.message);form.current?.reset();setProgress(100);router.refresh();
  }catch(error){setNotice(error instanceof Error?error.message:"The old cover is still in place. Please retry.");}
  finally{setBusy(false);}
 }
 return <details className="fm-release-editor">
  <summary>Replace cover artwork</summary>
  <form ref={form} onSubmit={submit}>
   <p>Use a corrected artist-approved image. This preserves the song ID, recording, comments, likes and listening statistics.</p>
   <label>Corrected image<input type="file" name="cover_file" accept=".jpg,.jpeg,.png,.webp" required disabled={busy}/></label>
   <label>Reason for the artwork correction<textarea name="reason" minLength={10} maxLength={500} rows={2} required disabled={busy} placeholder="e.g. Artist requested updated approved release artwork"/></label>
   <label className="fm-release-editor-check"><input type="checkbox" name="rights" required disabled={busy}/> I confirm the replacement image is authorised by the artist or rights holder.</label>
   <button type="submit" disabled={busy}>{busy?"Replacing cover…":"Verify and replace cover"}</button>
   {busy&&<progress max={100} value={progress} aria-label="Cover upload progress"/>}
   {notice&&<p role="status">{notice}</p>}
  </form>
 </details>;
}
