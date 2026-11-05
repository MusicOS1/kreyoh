"use client";
import {createContext,useContext,useEffect,useRef,useState,useCallback,type FormEvent} from 'react';
import {backgroundInteraction} from '../lib/backgroundInteraction';
export type ChatMessage={id:string;body:string;sender_id:string;created_at:string;read_at:string|null;reply_to_id?:string|null};
export type ChatReaction={message_id:string;user_id:string;emoji:string};
export type ReplyTarget={id:string;body:string;sender:string};
type Snapshot={messages:ChatMessage[];reactions:ChatReaction[];disabled:boolean;blocked:boolean};
export type ChatWallpaper="studio"|"embers"|"midnight"|"graphite"|"custom";
export type ChatAppearance={wallpaper:ChatWallpaper;image?:string};
const WALLPAPERS:ChatWallpaper[]=["studio","embers","midnight","graphite","custom"];
const Context=createContext<{snapshot:Snapshot;refresh:()=>Promise<void>;appearance:ChatAppearance;setAppearance:(next:ChatAppearance)=>boolean;replyTarget:ReplyTarget|null;setReplyTarget:(reply:ReplyTarget|null)=>void}|null>(null);
export const useConversation=()=>useContext(Context);
export function ConversationProvider({other,initial,before,children}:{other:string;initial:Snapshot;before?:string;children:React.ReactNode}){
 const[snapshot,setSnapshot]=useState(initial),[error,setError]=useState('');
 const[appearance,setAppearanceState]=useState<ChatAppearance>({wallpaper:"studio"});
 const[replyTarget,setReplyTarget]=useState<ReplyTarget|null>(null);
 const revision=useRef(0),alive=useRef(true);
 useEffect(()=>{
  try{
   const saved=window.localStorage.getItem("fackts:chat:appearance:"+other);
   if(!saved)return;
   const parsed=JSON.parse(saved) as ChatAppearance;
   if(WALLPAPERS.includes(parsed.wallpaper) && (parsed.wallpaper!=="custom"||(typeof parsed.image==="string"&&parsed.image.startsWith("data:image/jpeg;base64,"))))setAppearanceState(parsed);
  }catch{/* Private browser settings may be unavailable; chat still works. */}
 },[other]);
 const setAppearance=useCallback((next:ChatAppearance)=>{
  try{window.localStorage.setItem("fackts:chat:appearance:"+other,JSON.stringify(next));setAppearanceState(next);return true;}
  catch{return false;}
 },[other]);
 const refresh=useCallback(async()=>{
  const current=++revision.current;
  try{const next=await backgroundInteraction<Snapshot>('conversation',{other,before});if(alive.current&&current===revision.current){setSnapshot(next);setError('');}}
  catch{if(alive.current&&current===revision.current)setError('Messages could not be refreshed. Reconnect to retry.');}
 },[other,before]);
 useEffect(()=>{
  alive.current=true;
  if(!before)void refresh();
  const onChat=(event:Event)=>{
   const sender=(event as CustomEvent<{senderId?:string;recipientId?:string}>).detail;
   if(!before&&(sender?.senderId===other||sender?.recipientId===other))void refresh();
  };
  const onResume=()=>{if(!before&&document.visibilityState==="visible")void refresh();};
  window.addEventListener("fm:chat:changed",onChat);
  window.addEventListener("online",onResume);
  document.addEventListener("visibilitychange",onResume);
  const timer=setInterval(()=>{if(!before&&document.visibilityState==="visible")void refresh();},30000);
  return()=>{alive.current=false;clearInterval(timer);window.removeEventListener("fm:chat:changed",onChat);window.removeEventListener("online",onResume);document.removeEventListener("visibilitychange",onResume)};
 },[refresh,before,other]);
 return <Context.Provider value={{snapshot,refresh,appearance,setAppearance,replyTarget,setReplyTarget}}>{children}{error&&<p role="status">{error} <button onClick={()=>void refresh()}>Retry</button></p>}</Context.Provider>;
}

/** Uses the visible viewport so iOS/Android keyboards never cover the composer. */
export function MobileChatViewport(){
 useEffect(()=>{
  const stage=document.querySelector<HTMLElement>(".fm-chat-stage");
  if(!stage)return;
  const viewport=window.visualViewport;
  const sync=()=>{
   stage.style.setProperty("--fm-chat-visible-height",Math.round(viewport?.height||window.innerHeight)+"px");
   stage.style.setProperty("--fm-chat-visible-top",Math.round(viewport?.offsetTop||0)+"px");
  };
  sync();
  viewport?.addEventListener("resize",sync);
  viewport?.addEventListener("scroll",sync);
  window.addEventListener("orientationchange",sync);
  return()=>{
   viewport?.removeEventListener("resize",sync);
   viewport?.removeEventListener("scroll",sync);
   window.removeEventListener("orientationchange",sync);
   stage.style.removeProperty("--fm-chat-visible-height");
   stage.style.removeProperty("--fm-chat-visible-top");
  };
 },[]);
 return null;
}
export function ConversationRefresh(_props:{other:string;latest:string}){return null;}
export function ConversationAvailability(){const context=useConversation();return context?.snapshot.disabled?<div className="fm-chat-disabled" role="status">Messaging is unavailable. Check your email confirmation or block settings.</div>:null;}
const EMOJI_GROUPS=[
 {name:"Smileys",items:[["😀","grinning"],["😄","smile"],["😁","beaming"],["😂","laughing"],["🤣","rolling laughing"],["🥹","happy tears"],["😊","blush"],["😍","heart eyes"],["🥰","love"],["😘","kiss"],["😎","cool"],["🤩","star struck"],["🥳","party"],["😭","crying"],["🥲","smiling tear"],["😢","sad"],["😅","nervous"],["😤","huff"],["😡","angry"],["🤔","thinking"],["🙄","eye roll"],["😴","sleeping"],["🤯","mind blown"],["🫠","melting"]]},
 {name:"Gestures",items:[["👍","thumbs up"],["👎","thumbs down"],["👏","clap"],["🙌","hands up"],["🙏","thank you prayer"],["👊","fist bump"],["🤝","handshake"],["💪","strong"],["✌️","peace"],["👌","okay"],["🫶","heart hands"],["👀","eyes"],["🔥","fire"],["💯","hundred"],["✅","check"],["🎉","celebration"]]},
 {name:"Hearts & symbols",items:[["❤️","red heart"],["🧡","orange heart"],["💛","yellow heart"],["💚","green heart"],["💙","blue heart"],["💜","purple heart"],["🖤","black heart"],["💔","broken heart"],["✨","sparkles"],["⭐","star"],["⚡","lightning"],["🌍","world"],["🌹","rose"],["💬","speech bubble"]]},
 {name:"Music & culture",items:[["🎶","music notes"],["🎵","note"],["🎧","headphones"],["🎤","microphone"],["🎹","keyboard"],["🎸","guitar"],["🥁","drums"],["🎼","score"],["🎙️","studio microphone"],["📀","disc"],["🎬","film"],["📸","camera"],["🚀","rocket"],["🇰🇪","Kenya flag"]]}
] as const;
export function MessageComposer({other,disabled}:{other:string;disabled:boolean}){
 const context=useConversation();const unavailable=context?.snapshot.disabled??disabled;
 const[draft,setDraft]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const[emojiOpen,setEmojiOpen]=useState(false),[emojiSearch,setEmojiSearch]=useState('');
 const input=useRef<HTMLTextAreaElement>(null),form=useRef<HTMLFormElement>(null),lock=useRef(false),emojiArea=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const area=input.current;if(!area)return;
  area.style.height="44px";
  area.style.height=Math.min(area.scrollHeight,136)+"px";
 },[draft]);
 useEffect(()=>{
  if(!emojiOpen)return;
  const close=(event:PointerEvent)=>{if(!emojiArea.current?.contains(event.target as Node))setEmojiOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setEmojiOpen(false);};
  document.addEventListener("pointerdown",close);
  document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape);};
 },[emojiOpen]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(unavailable||lock.current||!draft.trim())return;
  const body=draft;const replyId=context?.replyTarget?.id;lock.current=true;setPending(true);setError('');
  const data=new FormData();data.set('recipient',other);data.set('body',body);if(replyId)data.set('reply_to',replyId);
  try{const result=await backgroundInteraction<{error:string;sent:number}>('messageSend',data);if(result.error)throw new Error(result.error);setDraft(current=>current===body?'':current);context?.setReplyTarget(null);await context?.refresh();input.current?.focus();}
  catch(error){setError(error instanceof Error?error.message:'Message could not be sent. Your text is kept.');}
  finally{lock.current=false;setPending(false);}
 }
 function insertEmoji(emoji:string){
  const area=input.current;if(!area)return;
  const start=area.selectionStart,end=area.selectionEnd;
  setDraft(current=>current.slice(0,start)+emoji+current.slice(end));
  setEmojiOpen(false);
  requestAnimationFrame(()=>{area.focus();const caret=start+emoji.length;area.setSelectionRange(caret,caret);});
 }
 const search=emojiSearch.trim().toLowerCase();
 return <form ref={form} onSubmit={submit} className="message-composer fm-chat-composer">
  {context?.replyTarget&&<div className="fm-chat-reply-preview"><span><strong>Replying to {context.replyTarget.sender}</strong><small>{context.replyTarget.body.slice(0,130)}</small></span><button type="button" onClick={()=>context.setReplyTarget(null)} aria-label="Cancel reply">×</button></div>}
  <div className="fm-chat-emoji-area" ref={emojiArea}>
   <button type="button" className="fm-chat-emoji" disabled={unavailable} onClick={()=>{setEmojiOpen(current=>!current);setEmojiSearch('');}} aria-label="Choose emoji" aria-haspopup="dialog" aria-expanded={emojiOpen}>☺</button>
   {emojiOpen&&<div className="fm-chat-emoji-picker" role="dialog" aria-label="Choose an emoji">
    <label className="fm-chat-emoji-search"><span className="sr-only">Search emojis</span><input type="search" value={emojiSearch} onChange={event=>setEmojiSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter")event.preventDefault();}} placeholder="Search emojis" autoComplete="off"/></label>
    <div className="fm-chat-emoji-scroll">{EMOJI_GROUPS.map(group=>{
     const items=group.items.filter(([emoji,name])=>!search||name.includes(search)||emoji.includes(search));
     return items.length>0?<section key={group.name}><h3>{group.name}</h3><div className="fm-chat-emoji-grid">{items.map(([emoji,name])=><button key={name} type="button" title={name} aria-label={name} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div></section>:null;
    })}{search&&!EMOJI_GROUPS.some(group=>group.items.some(([emoji,name])=>name.includes(search)||emoji.includes(search)))&&<p>No matching emojis</p>}</div>
   </div>}
  </div>
  <label className="fm-chat-input-wrap"><span className="sr-only">Your message</span><textarea ref={input} name="body" maxLength={2000} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(!pending)form.current?.requestSubmit();}}} required disabled={unavailable} placeholder={unavailable?'Messaging unavailable':'Message…'} /></label>
  <button className="fm-chat-send" type="submit" disabled={unavailable||pending||!draft.trim()} aria-label={pending?'Sending message':'Send message'}>{pending?'…':'➤'}</button>
  {error&&<p className="fm-chat-composer-status" role="alert">{error}</p>}
 </form>;
}
export function MemberBlock({other,blocked}:{other:string;blocked:boolean}){
 const context=useConversation();const current=context?.snapshot.blocked??blocked;
 const[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 return <form className="fm-chat-block" onSubmit={async event=>{event.preventDefault();if(pending)return;setPending(true);const data=new FormData();data.set('recipient',other);data.set('operation',current?'unblock':'block');try{const result=await backgroundInteraction<{message:string}>('memberBlock',data);setNotice(result.message);await context?.refresh();}catch{setNotice('Could not change block settings. Try again.');}finally{setPending(false);}}}><button disabled={pending}>{current?'Unblock member':'Block member'}</button>{notice&&<p role="status">{notice}</p>}</form>;
}
