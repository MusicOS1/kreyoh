"use client";
import {createContext,useContext,useEffect,useRef,useState,useCallback,type FormEvent} from 'react';
import {backgroundInteraction} from '../lib/backgroundInteraction';
export type ChatMessage={id:string;body:string;sender_id:string;created_at:string;read_at:string|null};
type Snapshot={messages:ChatMessage[];disabled:boolean;blocked:boolean};
const Context=createContext<{snapshot:Snapshot;refresh:()=>Promise<void>}|null>(null);
export const useConversation=()=>useContext(Context);
export function ConversationProvider({other,initial,before,children}:{other:string;initial:Snapshot;before?:string;children:React.ReactNode}){
 const[snapshot,setSnapshot]=useState(initial),[error,setError]=useState('');
 const revision=useRef(0),alive=useRef(true);
 const refresh=useCallback(async()=>{
  const current=++revision.current;
  try{const next=await backgroundInteraction<Snapshot>('conversation',{other,before});if(alive.current&&current===revision.current){setSnapshot(next);setError('');}}
  catch{if(alive.current&&current===revision.current)setError('Messages could not be refreshed. Reconnect to retry.');}
 },[other,before]);
 useEffect(()=>{alive.current=true;if(!before)void refresh();const timer=setInterval(()=>{if(!before&&document.visibilityState==='visible')void refresh();},10000);return()=>{alive.current=false;clearInterval(timer)};},[refresh,before]);
 return <Context.Provider value={{snapshot,refresh}}>{children}{error&&<p role="status">{error} <button onClick={()=>void refresh()}>Retry</button></p>}</Context.Provider>;
}
export function ConversationRefresh(_props:{other:string;latest:string}){return null;}
export function ConversationAvailability(){const context=useConversation();return context?.snapshot.disabled?<div className="fm-chat-disabled" role="status">Messaging is unavailable. Check your email confirmation or block settings.</div>:null;}
export function MessageComposer({other,disabled}:{other:string;disabled:boolean}){
 const context=useConversation();const unavailable=context?.snapshot.disabled??disabled;
 const[draft,setDraft]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLTextAreaElement>(null),form=useRef<HTMLFormElement>(null),lock=useRef(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(unavailable||lock.current||!draft.trim())return;
  const body=draft;lock.current=true;setPending(true);setError('');
  const data=new FormData();data.set('recipient',other);data.set('body',body);
  try{const result=await backgroundInteraction<{error:string;sent:number}>('messageSend',data);if(result.error)throw new Error(result.error);setDraft(current=>current===body?'':current);await context?.refresh();input.current?.focus();}
  catch(error){setError(error instanceof Error?error.message:'Message could not be sent. Your text is kept.');}
  finally{lock.current=false;setPending(false);}
 }
 function insertEmoji(){const area=input.current;if(!area)return;const start=area.selectionStart,end=area.selectionEnd;setDraft(draft.slice(0,start)+'🎶'+draft.slice(end));requestAnimationFrame(()=>{area.focus();area.setSelectionRange(start+2,start+2)});}
 return <form ref={form} onSubmit={submit} className="message-composer fm-chat-composer">
  <button type="button" className="fm-chat-emoji" disabled={unavailable} onClick={insertEmoji} aria-label="Add music emoji">♫</button>
  <label className="fm-chat-input-wrap"><span className="sr-only">Your message</span><textarea ref={input} name="body" maxLength={2000} rows={1} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(!pending)form.current?.requestSubmit();}}} required disabled={unavailable} placeholder={unavailable?'Messaging unavailable':'Message…  (Shift + Enter for new line)'}/></label>
  <button className="fm-chat-send" type="submit" disabled={unavailable||pending||!draft.trim()} aria-label={pending?'Sending message':'Send message'}>{pending?'…':'➤'}</button>
  {error&&<p className="fm-chat-composer-status" role="alert">{error}</p>}
 </form>;
}
export function MemberBlock({other,blocked}:{other:string;blocked:boolean}){
 const context=useConversation();const current=context?.snapshot.blocked??blocked;
 const[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 return <form className="fm-chat-block" onSubmit={async event=>{event.preventDefault();if(pending)return;setPending(true);const data=new FormData();data.set('recipient',other);data.set('operation',current?'unblock':'block');try{const result=await backgroundInteraction<{message:string}>('memberBlock',data);setNotice(result.message);await context?.refresh();}catch{setNotice('Could not change block settings. Try again.');}finally{setPending(false);}}}><button disabled={pending}>{current?'Unblock member':'Block member'}</button>{notice&&<p role="status">{notice}</p>}</form>;
}
