"use client";
import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import Link from "next/link";
import {createClient} from "../lib/client";
import {playChatTone,readChatAlerts,readChatMute} from "../lib/chatAlerts";
import type {Session} from "@supabase/supabase-js";

/** A single authenticated user-scoped websocket. No message text is ever sent over the event stream. */
export default function ChatLiveAlerts(){
 const pathname=usePathname(),router=useRouter();
 const [notice,setNotice]=useState<{text:string;href:string}|null>(null);
 useEffect(()=>{
  const client=createClient();
  let channel:ReturnType<typeof client.channel>|null=null;
  let version=0,active=true;
  let toastTimer:ReturnType<typeof setTimeout>|null=null;
  const show=(text:string,href:string)=>{
   if(!active)return;
   setNotice({text,href});
   if(toastTimer)clearTimeout(toastTimer);
   toastTimer=setTimeout(()=>{if(active)setNotice(null);},7000);
  };
  const incoming=(kind:"chat"|"inbox",payload:Record<string,unknown>,userId:string)=>{
   window.dispatchEvent(new CustomEvent(kind==="chat"?"fm:chat:changed":"fm:inbox:changed",{detail:payload}));
   if(kind==="inbox"){
    if(pathname.startsWith("/inbox")||pathname.startsWith("/notifications"))router.refresh();
    return;
   }
   const senderId=typeof payload.senderId==="string"?payload.senderId:"";
   if(!senderId||senderId===userId||payload.readReceipt===true||payload.reaction===true)return; // Silent receipts and reactions.
   if(pathname==="/messages/"+senderId)return; // Already reading the conversation.
   const prefs=readChatAlerts(userId);
   if(!prefs.enabled||readChatMute(userId,senderId))return;
   playChatTone(prefs.sound);
   if(prefs.vibrate&&"vibrate" in navigator)try{navigator.vibrate(70);}catch{}
   const href="/messages/"+encodeURIComponent(senderId);
   show("New message on FACKTS Music",href);
   if(prefs.showSystem&&typeof Notification!=="undefined"&&Notification.permission==="granted"&&document.hidden){
    try{const n=new Notification("FACKTS Music",{body:"You have a new private message",icon:"/branding/fackts-music-logo.png",tag:"fackts-message-"+senderId});n.onclick=()=>{window.focus();router.push(href);};}catch{}
   }
  };
  const connect=async(session:Session|null)=>{
   const current=++version;
   if(channel){void client.removeChannel(channel);channel=null;}
   if(!session)return;
   try{
    await client.realtime.setAuth(session.access_token);
    if(!active||current!==version)return;
    const userId=session.user.id;
    const next=client.channel("fm:user:"+userId,{config:{private:true}})
      .on("broadcast",{event:"chat"},({payload})=>incoming("chat",payload,userId))
      .on("broadcast",{event:"inbox"},({payload})=>incoming("inbox",payload,userId))
      .subscribe();
    channel=next;
   }catch{/* The existing 30-second chat refresh remains the fallback. */}
  };
  void client.auth.getSession().then(({data})=>connect(data.session)).catch(()=>{});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{void connect(session);});
  return()=>{active=false;version++;subscription.unsubscribe();if(channel)void client.removeChannel(channel);if(toastTimer)clearTimeout(toastTimer);};
 // pathname is intentionally a dependency so chat view suppression stays accurate.
 },[pathname,router]);
 if(!notice)return null;
 return <div className="fm-chat-live-toast" role="status"><span>{notice.text}</span><Link href={notice.href} aria-label="Open new message">Open chat</Link><button type="button" aria-label="Dismiss alert" onClick={()=>setNotice(null)} style={{background:"transparent",border:0,color:"#aaa",fontSize:18,cursor:"pointer"}}>×</button></div>;
}
