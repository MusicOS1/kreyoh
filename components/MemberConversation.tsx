"use client";
import {useActionState,useEffect,useRef} from "react";
import {useRouter} from "next/navigation";
import {sendMessage,markConversationRead,blockMember} from "../app/messages/actions";

export function ConversationRefresh({other,latest}:{other:string;latest:string}){
 const router=useRouter();
 useEffect(()=>{if(document.visibilityState==="visible")void markConversationRead(other);},[other,latest]);
 useEffect(()=>{
  const timer=setInterval(()=>{if(document.visibilityState==="visible")router.refresh();},10000);
  return()=>clearInterval(timer);
 },[router]);
 return null;
}

export function MessageComposer({other,disabled}:{other:string;disabled:boolean}){
 const[state,action,pending]=useActionState(sendMessage,{error:"",sent:0});
 const ref=useRef<HTMLFormElement>(null),input=useRef<HTMLTextAreaElement>(null);
 const router=useRouter();
 useEffect(()=>{if(state.sent){ref.current?.reset();router.refresh();input.current?.focus();}},[state.sent,router]);
 function insertEmoji(){
  const area=input.current;if(!area)return;
  const start=area.selectionStart,end=area.selectionEnd;
  area.value=area.value.slice(0,start)+"🎶"+area.value.slice(end);
  area.focus();area.setSelectionRange(start+2,start+2);
 }
 function onKeyDown(event:React.KeyboardEvent<HTMLTextAreaElement>){
  if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){
   event.preventDefault();
   if(!disabled&&!pending&&event.currentTarget.value.trim())ref.current?.requestSubmit();
  }
 }
 return <form ref={ref} action={action} className="message-composer fm-chat-composer">
   <input name="recipient" type="hidden" value={other}/>
   <button type="button" className="fm-chat-emoji" disabled={disabled||pending} onClick={insertEmoji} aria-label="Add music emoji">♫</button>
   <label className="fm-chat-input-wrap"><span className="sr-only">Your message</span><textarea ref={input} name="body" maxLength={2000} rows={1} onKeyDown={onKeyDown} required disabled={disabled||pending} placeholder={disabled?"Messaging unavailable":"Message…  (Shift + Enter for new line)"}/></label>
   <button className="fm-chat-send" type="submit" disabled={disabled||pending} aria-label={pending?"Sending message":"Send message"}>{pending?"…":<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>}</button>
   {state.error&&<p className="fm-chat-composer-status" role="alert">{state.error}</p>}
   {state.sent>0&&<span className="sr-only" role="status">Message sent.</span>}
  </form>;
}
export function MemberBlock({other,blocked}:{other:string;blocked:boolean}){
 const[state,action,pending]=useActionState(blockMember,{message:""});
 return <form action={action} className="fm-chat-block"><input type="hidden" name="recipient" value={other}/><input type="hidden" name="operation" value={blocked?"unblock":"block"}/><button disabled={pending}>{blocked?"Unblock member":"Block member"}</button>{state.message&&<p role="status">{state.message}</p>}</form>;
}
