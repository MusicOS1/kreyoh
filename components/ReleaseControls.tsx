"use client";
import {useActionState,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {manageRelease,voteForRelease} from '../app/billboard/actions';
export function ReleaseManagement({id,status,owner=false}:{id:string;status:string;owner?:boolean}){
 const[state,action,pending]=useActionState(manageRelease,{message:''});
 return <form action={action} className="release-management"><input type="hidden" name="id" value={id}/>
 {!owner&&<label>Review note<textarea name="note" maxLength={1000} placeholder="Feedback or reason for removal"/></label>}
 <div className="community-actions">{owner?<button name="operation" value="withdraw" disabled={pending||status==='withdrawn'}>Withdraw release</button>:status==='pending'?<><button name="operation" value="publish" disabled={pending}>Approve release</button><button name="operation" value="reject" disabled={pending}>Return to artist</button></>:status==='published'?<button name="operation" value="remove" disabled={pending}>Remove from public</button>:null}</div>
 {state.message&&<p role="status">{state.message}</p>}</form>;
}
export function VoteButton({id,voted,own=false}:{id:string;voted:boolean;own?:boolean}){
 const[pending,start]=useTransition(),[notice,setNotice]=useState('');const router=useRouter();
 return <div><button disabled={pending||own} aria-pressed={voted} onClick={()=>start(async()=>{const result=await voteForRelease(id,!voted);setNotice(result.ok?(!voted?'Your vote is counted this week.':'Vote removed.'):result.error||'Try again.');if(result.ok)router.refresh();})}>{own?'Your release':pending?'Saving…':voted?'Voted ✓ · Undo':'Vote this week'}</button>{notice&&<p role="status">{notice}</p>}</div>;
}
export function ShareRelease({id,title}:{id:string;title:string}){
 const[notice,setNotice]=useState('');return <><button type="button" onClick={async()=>{const url=`${window.location.origin}/billboard/${id}`;try{await navigator.clipboard.writeText(url);setNotice('Link copied. Share it with your fans.');}catch{setNotice(url);}}}>Copy song link</button>{notice&&<small role="status">{notice}</small>}</>;
}
