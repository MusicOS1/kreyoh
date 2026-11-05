"use client";

import {useEffect,useRef,useState,type ChangeEvent} from "react";
import {useConversation,type ChatWallpaper} from "./MemberConversation";

const choices:{id:ChatWallpaper;name:string;description:string}[]=[
 {id:"studio",name:"Studio Black",description:"FACKTS original"},
 {id:"embers",name:"Orange Pulse",description:"Warm, subtle pattern"},
 {id:"midnight",name:"Midnight",description:"Deep blue-black"},
 {id:"graphite",name:"Graphite",description:"Minimal dark grey"},
];

export default function ChatAppearanceControl(){
 const conversation=useConversation();
 const[open,setOpen]=useState(false),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null),upload=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[open]);
 function select(wallpaper:ChatWallpaper){
  if(!conversation?.setAppearance({wallpaper,image:conversation.appearance.image}))setError("Could not save this background on your device.");
  else{setError("");setOpen(false);}
 }
 async function choosePhoto(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024){
   setError("Choose a JPG, PNG or WebP photo under 8 MB.");return;
  }
  const source=URL.createObjectURL(file);
  try{
   const picture=new Image();
   await new Promise<void>((resolve,reject)=>{
    picture.onload=()=>resolve();picture.onerror=()=>reject(new Error("Photo could not be opened."));
    picture.src=source;
   });
   const scale=Math.min(1,1200/Math.max(picture.naturalWidth,picture.naturalHeight));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
   const context=canvas.getContext("2d");
   if(!context)throw Error("Photo processing is unavailable.");
   context.fillStyle="#0b0b0b";context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(picture,0,0,canvas.width,canvas.height);
   const image=canvas.toDataURL("image/jpeg",0.72);
   if(image.length>1_800_000)throw Error("Try a smaller photo for your chat background.");
   if(!conversation?.setAppearance({wallpaper:"custom",image}))throw Error("Device storage is full. Try a built-in background.");
   setError("");setOpen(false);
  }catch(err){setError(err instanceof Error?err.message:"Photo could not be applied.");}
  finally{URL.revokeObjectURL(source);}
 }
 return <div ref={root} className="fm-chat-appearance">
  <button type="button" className="fm-chat-appearance-trigger" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-haspopup="dialog" aria-label="Change chat background" title="Chat background">◈</button>
  {open&&<section className="fm-chat-appearance-panel" role="dialog" aria-label="Chat background settings">
   <div className="fm-chat-appearance-heading"><div><strong>Chat background</strong><small>Choose a look for this conversation</small></div><button type="button" aria-label="Close background settings" onClick={()=>setOpen(false)}>×</button></div>
   <div className="fm-chat-wallpaper-grid">{choices.map(choice=><button key={choice.id} type="button" className={"fm-chat-wallpaper-option fm-preview-"+choice.id} aria-pressed={conversation?.appearance.wallpaper===choice.id} onClick={()=>select(choice.id)}>
     <span className="fm-chat-wallpaper-swatch" aria-hidden="true"><i/><i/><i/></span><strong>{choice.name}</strong><small>{choice.description}</small>
    </button>)}</div>
   {conversation?.appearance.image&&<button type="button" className="fm-chat-use-photo" onClick={()=>select("custom")}>Use my saved photo</button>}
   <input ref={upload} className="sr-only" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-label="Upload a chat background photo"/>
   <button type="button" className="fm-chat-upload-wallpaper" onClick={()=>upload.current?.click()}>+ Choose photo from phone</button>
   <p className="fm-chat-wallpaper-note">Saved privately on this device for this chat. Photos are not sent to FACKTS.</p>
   {error&&<p role="alert" className="fm-chat-appearance-error">{error}</p>}
  </section>}
 </div>;
}
