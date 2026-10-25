'use client';
import {useEffect,useState,useRef} from 'react';
import {backgroundInteraction} from '../lib/backgroundInteraction';
export default function NotificationReadButton({id,label='Mark read'}:{id?:string;label?:string}){
 const[read,setRead]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 useEffect(()=>{const update=(event:Event)=>{const detail=(event as CustomEvent).detail;if(!detail.id||detail.id===id)setRead(true)};window.addEventListener('fm-notification-read',update);return()=>window.removeEventListener('fm-notification-read',update);},[id]);
 return <span className={read?'notification-read-local':''}><button type="button" disabled={pending||read} onClick={async()=>{if(lock.current)return;lock.current=true;setPending(true);setError('');try{await backgroundInteraction('notificationRead',{id});setRead(true);window.dispatchEvent(new CustomEvent('fm-notification-read',{detail:{id}}));window.dispatchEvent(new Event('fm-identity-refresh'));}catch{setError('Could not mark read. Try again.');}finally{lock.current=false;setPending(false);}}}>{read?(id?'Read ✓':'All read ✓'):label}</button>{error&&<small role="alert">{error}</small>}</span>;
}
