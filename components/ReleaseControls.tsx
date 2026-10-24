"use client";
import {useActionState,useState,useRef,useEffect} from 'react';
import {backgroundInteraction,backgroundFormAction} from '../lib/backgroundInteraction';

export function ReleaseManagement({id,status:initialStatus,owner=false}:{id:string;status:string;owner?:boolean}){
 const[status,setStatus]=useState(initialStatus);
 const[state,action,pending]=useActionState(async(_state:{message:string},form:FormData)=>{try{const result=await backgroundInteraction<{message:string;ok?:boolean;status?:string}>('releaseManage',form);if(result.ok&&result.status)setStatus(result.status);return result;}catch{return {message:'Could not update this release. Please retry.'};}},{message:''});
 return <form action={action} className="release-management"><input type="hidden" name="id" value={id}/>
 {!owner&&<label>Review note<textarea name="note" maxLength={1000} placeholder="Feedback or reason for removal"/></label>}
 <div className="community-actions">{owner?<button name="operation" value="withdraw" disabled={pending||status==='withdrawn'}>Withdraw release</button>:status==='pending'?<><button name="operation" value="publish" disabled={pending}>Approve release</button><button name="operation" value="reject" disabled={pending}>Return to artist</button></>:status==='published'?<button name="operation" value="remove" disabled={pending}>Remove from public</button>:null}</div>
 {state.message&&<p role="status">{state.message}</p>}</form>;
}
export function VoteButton({id,voted,own=false}:{id:string;voted:boolean;own?:boolean}){
 const [selected,setSelected]=useState(voted),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function vote(){
  if(own||lock.current)return;
  const previous=selected;setNotice('');lock.current=true;setPending(true);setSelected(!previous);window.dispatchEvent(new CustomEvent('fm-release-vote',{detail:{id,delta:previous?-1:1}}));
  try{const result=await backgroundInteraction<{ok:boolean;error?:string}>('releaseVote',{id,enabled:!previous});if(!result.ok)throw new Error(result.error||'Vote could not be saved.');}
  catch(error){setSelected(previous);window.dispatchEvent(new CustomEvent('fm-release-vote',{detail:{id,delta:previous?1:-1}}));setNotice(error instanceof Error?error.message:'Try again.');}
  finally{lock.current=false;setPending(false);}
 }
 return <div><button type="button" disabled={pending||own} aria-busy={pending} aria-pressed={selected} onClick={()=>void vote()}>{own?'Your release':selected?'Voted ✓ · Undo':'Vote this week'}</button>{notice&&<p role="status">{notice}</p>}</div>;
}
export function ShareRelease({id,title}:{id:string;title:string}){
 const[notice,setNotice]=useState('');return <><button type="button" aria-label={`Share ${title}`} onClick={async()=>{const url=`${window.location.origin}/billboard/${id}`;try{if(navigator.share){await navigator.share({title,url});return;}await navigator.clipboard.writeText(url);setNotice('Link copied.');}catch(error){if(error instanceof Error&&error.name==='AbortError')return;setNotice(url);}}}>↗ Share</button>{notice&&<small role="status">{notice}</small>}</>;
}

export function ReleaseVoteCount({id,count}:{id:string;count:number}){
 const[value,setValue]=useState(count);
 useEffect(()=>{const update=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail.id===id)setValue(current=>Math.max(0,current+detail.delta));};window.addEventListener('fm-release-vote',update);return()=>window.removeEventListener('fm-release-vote',update);},[id]);
 return <span>{value} votes</span>;
}
