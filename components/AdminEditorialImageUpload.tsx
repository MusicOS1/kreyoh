"use client";
import {useEffect,useState} from "react";
import {createClient} from "../lib/client";

const MAX_BYTES=12*1024*1024;
const MIME_TYPES=["image/jpeg","image/png","image/webp"];

export default function AdminEditorialImageUpload({
 image,onUploaded,onBusyChange
}:{image:string;onUploaded:(url:string)=>void;onBusyChange?:(busy:boolean)=>void}){
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>()=>{if(preview.startsWith("blob:"))URL.revokeObjectURL(preview);},[preview]);

 function selectFile(selected:File|undefined){
  setError("");setMessage("");setFile(null);setPreview("");
  if(!selected)return;
  if(!MIME_TYPES.includes(selected.type)||selected.size<=0||selected.size>MAX_BYTES){
   setError("Choose a JPG, PNG or WebP picture, maximum 12 MB.");return;
  }
  setFile(selected);
  setPreview(URL.createObjectURL(selected));
 }
 async function upload(){
  if(!file||busy)return;
  setBusy(true);onBusyChange?.(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/editorial-images",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({type:file.type,size:file.size})
   });
   const prepared=await response.json();
   if(!response.ok||!prepared.ok)throw Error(prepared.error||"Could not prepare the picture upload.");
   const {error:uploadError}=await createClient().storage.from("music-images")
    .uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type});
   if(uploadError)throw Error(uploadError.message);
   onUploaded(prepared.imageUrl);
   setFile(null);setPreview("");
   setMessage("Picture uploaded. Save the hero or content below to apply it.");
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Picture upload failed. Please try again.");
  }finally{setBusy(false);onBusyChange?.(false);}
 }
 const visibleImage=preview||image;
 return <div className="admin-editorial-upload">
  <label className="admin-editorial-upload-label">Upload picture from your device
   <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
    onChange={event=>selectFile(event.target.files?.[0])}/>
  </label>
  {visibleImage&&<img className="admin-editorial-upload-thumb" src={visibleImage} alt="Selected picture preview"/>}
  <div className="admin-editorial-upload-actions">
   <button type="button" onClick={()=>void upload()} disabled={!file||busy}>
    {busy?"Uploading picture…":"Upload picture"}
   </button>
   <small>JPG, PNG or WebP · 12 MB maximum</small>
  </div>
  {message&&<p role="status" className="hero-admin-success">{message}</p>}
  {error&&<p role="alert" className="hero-admin-error">{error}</p>}
 </div>;
}
