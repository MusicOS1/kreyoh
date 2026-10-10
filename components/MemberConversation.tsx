"use client";
import {useActionState,useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {sendMessage,markConversationRead,blockMember} from '../app/messages/actions';
export function ConversationRefresh({other,latest}:{other:string;latest:string}){
 const router=useRouter();useEffect(()=>{if(document.visibilityState==='visible')void markConversationRead(other);},[other,latest]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},10000);return()=>clearInterval(timer);},[router]);return null;
}
export function MessageComposer({other,disabled}:{other:string;disabled:boolean}){
 const[state,action,pending]=useActionState(sendMessage,{error:'',sent:0});const ref=useRef<HTMLFormElement>(null);
 useEffect(()=>{if(state.sent)ref.current?.reset();},[state.sent]);
 return <form ref={ref} action={action} className="message-composer"><input name="recipient" type="hidden" value={other}/><label>Message<textarea name="body" maxLength={2000} required disabled={disabled||pending} placeholder={disabled?'Messaging unavailable':'Write a message…'}/></label><button disabled={disabled||pending}>{pending?'Sending…':'Send message'}</button>{state.error&&<p role="alert">{state.error}</p>}{state.sent>0&&<span role="status">Message sent.</span>}</form>;
}
export function MemberBlock({other,blocked}:{other:string;blocked:boolean}){
 const[state,action,pending]=useActionState(blockMember,{message:''});return <form action={action}><input type="hidden" name="recipient" value={other}/><input type="hidden" name="operation" value={blocked?'unblock':'block'}/><button disabled={pending}>{blocked?'Unblock member':'Block member'}</button>{state.message&&<p role="status">{state.message}</p>}</form>;
}
