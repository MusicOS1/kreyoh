"use client";
import {useEffect,useRef,useState} from "react";
import {defaultAlerts,readChatAlerts,writeChatAlerts,readChatMute,writeChatMute,playChatTone,type ChatAlerts} from "../lib/chatAlerts";

export default function ChatAlertPreferences({userId,other}:{userId:string;other?:string}){
 const [open,setOpen]=useState(false);
 const [prefs,setPrefs]=useState<ChatAlerts>(defaultAlerts);
 const [muted,setMuted]=useState(false);
 const [permission,setPermission]=useState("unsupported");
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  setPrefs(readChatAlerts(userId));
  if(other)setMuted(readChatMute(userId,other));
  setPermission(typeof Notification==="undefined"?"unsupported":Notification.permission);
 },[userId,other]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[open]);
 function update(next:ChatAlerts){setPrefs(next);writeChatAlerts(userId,next);}
 async function enablePhoneAlerts(){
  if(typeof Notification==="undefined")return;
  try{const result=await Notification.requestPermission();setPermission(result);update({...prefs,showSystem:result==="granted"});}catch{setPermission("unsupported");}
 }
 return <div className="fm-chat-alert-settings" ref={root}>
   <button type="button" className="fm-chat-alert-trigger" aria-label="Chat notification settings" title="Notification settings" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>♬</button>
   {open&&<section className="fm-chat-alert-panel" role="dialog" aria-label="FACKTS Music alert preferences">
    <h2>Chat notifications</h2>
    <p>Manage the sound and vibration of new-message alerts on this device.</p>
    <label><input type="checkbox" checked={prefs.enabled} onChange={e=>update({...prefs,enabled:e.target.checked})}/>Notify me of messages</label>
    <label><input type="checkbox" disabled={!prefs.enabled} checked={prefs.vibrate} onChange={e=>update({...prefs,vibrate:e.target.checked})}/>Vibrate when supported</label>
    <label htmlFor="fm-alert-sound">Notification sound</label>
    <select id="fm-alert-sound" disabled={!prefs.enabled} value={prefs.sound} onChange={e=>update({...prefs,sound:e.target.value as ChatAlerts["sound"]})}>
      <option value="soft">Soft signal</option><option value="pulse">FACKTS pulse</option><option value="off">Silent</option>
    </select>
    <button className="fm-alert-test" type="button" onClick={()=>playChatTone(prefs.sound)}>Preview sound</button>
    {other&&<label><input type="checkbox" checked={muted} onChange={e=>{setMuted(e.target.checked);writeChatMute(userId,other,e.target.checked)}}/>Mute this conversation</label>}
    {permission==="default"&&<button type="button" className="fm-alert-test" onClick={()=>void enablePhoneAlerts()}>Allow browser notifications</button>}
    {permission==="granted"&&<label><input type="checkbox" checked={prefs.showSystem} onChange={e=>update({...prefs,showSystem:e.target.checked})}/>Show permitted phone/browser alerts</label>}
    {permission==="denied"&&<p>Phone notifications are blocked in browser settings.</p>}
    <p className="fm-alert-subnote">These preferences affect alerts while FACKTS is running. Reliable alerts after the app is closed require the separate push-delivery service; this setting does not enable that yet.</p>
   </section>}
 </div>;
}
