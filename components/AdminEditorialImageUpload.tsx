"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "../lib/client";

const MAX_BYTES=12*1024*1024;
const MAX_SOURCE_BYTES=80*1024*1024;
const MIME_TYPES=["image/jpeg","image/png","image/webp"];
const TYPE_BY_EXTENSION:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
const mb=(bytes:number)=>(bytes/1024/1024).toFixed(1);
function mediaType(file:File){
 const extension=file.name.split(".").pop()?.toLowerCase()||"";
 return MIME_TYPES.includes(file.type)?file.type:TYPE_BY_EXTENSION[extension]||"";
}
async function preparePicture(file:File):Promise<File>{
 const type=mediaType(file);
 if(!type)throw Error("This file is not JPG, PNG or WebP. Export the poster as one of those formats.");
 if(file.size<=MAX_BYTES&&file.type===type)return file;
 if(file.size<=MAX_BYTES)return new File([file],file.name,{type,lastModified:file.lastModified});
 // Large designed posters should be readable, so downscale only if the compressed image stays over 12 MB.
 const bitmap=await createImageBitmap(file);
 try{
  for(const maxDimension of [3600,3000,2400]){
   const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext("2d");
   if(!context)throw Error("Your browser could not process this image.");
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.92,.83,.72]){
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",quality));
    if(blob&&blob.type==="image/webp"&&blob.size>0&&blob.size<=MAX_BYTES)
     return new File([blob],file.name.replace(/\.[^.]+$/,"")+".webp",{type:"image/webp"});
   }
  }
 }finally{bitmap.close();}
 throw Error("This poster is still above 12 MB after optimization. Export a smaller WebP and retry.");
}
export default function AdminEditorialImageUpload({
 image,onUploaded,onBusyChange,label="Upload picture from your device"
}:{image:string;onUploaded:(url:string)=>void;onBusyChange?:(busy:boolean)=>void;label?:string}){
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState("");
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>()=>{if(preview.startsWith("blob:"))URL.revokeObjectURL(preview);},[preview]);
 async function uploadSelected(selected:File){
  if(busyRef.current)return;
  busyRef.current=true;
  setBusy(true);onBusyChange?.(true);setError("");
  try{
   setMessage(selected.size>MAX_BYTES?"Optimizing large picture before upload…":"Uploading picture automatically…");
   const imageFile=await preparePicture(selected);
   const response=await fetch("/api/admin/editorial-images",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({type:imageFile.type,size:imageFile.size})
   });
   const prepared=await response.json();
   if(!response.ok||!prepared.ok)throw Error(prepared.error||"Could not prepare the picture upload.");
   setMessage("Saving picture to FACKTS storage…");
   const {error:uploadError}=await createClient().storage.from("music-images")
    .uploadToSignedUrl(prepared.path,prepared.token,imageFile,{contentType:imageFile.type});
   if(uploadError)throw Error("Storage upload failed: "+uploadError.message);
   onUploaded(prepared.imageUrl);
   setFile(null);setPreview("");
   setMessage("Picture uploaded ✓ — click Save show / content to publish the changes.");
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Picture upload failed. Choose or retry the picture.");
   setMessage("");
  }finally{
   busyRef.current=false;
   setBusy(false);onBusyChange?.(false);
  }
 }
 function selectFile(selected:File|undefined){
  setError("");setMessage("");setFile(null);setPreview("");
  if(!selected)return;
  if(!mediaType(selected)){
   setError("Unsupported picture format. Choose JPG, PNG or WebP.");return;
  }
  if(selected.size<=0||selected.size>MAX_SOURCE_BYTES){
   setError("This image is "+mb(selected.size)+" MB. Choose a picture smaller than 80 MB.");return;
  }
  setFile(selected);
  setPreview(URL.createObjectURL(selected));
  void uploadSelected(selected);
 }
 const visibleImage=preview||image;
 return <div className="admin-editorial-upload">
  <label className="admin-editorial-upload-label">{label}
   <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
    onChange={event=>selectFile(event.target.files?.[0])}/>
  </label>
  {visibleImage&&<img className="admin-editorial-upload-thumb" src={visibleImage} alt="Selected picture preview"/>}
  <div className="admin-editorial-upload-actions">
   {busy?<span className="fm-editorial-upload-working" role="status">Uploading…</span>:
    error&&file?<button type="button" onClick={()=>void uploadSelected(file)}>Retry upload</button>:
    <span className="fm-editorial-upload-working">{file?"Preparing picture…":"Selecting a picture starts upload automatically"}</span>}
   <small>JPG, PNG or WebP · 12 MB stored · large pictures optimized automatically</small>
  </div>
  {message&&<p role="status" aria-live="polite" className="hero-admin-success">{message}</p>}
  {error&&<p role="alert" className="hero-admin-error">{error}</p>}
 </div>;
}
