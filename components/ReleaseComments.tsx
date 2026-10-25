"use client";

import {useCallback,useEffect,useState,useRef,type FormEvent} from "react";
import Link from "next/link";
import type {PublicReleaseComment} from "../app/release-comments/actions";
import {backgroundInteraction} from "../lib/backgroundInteraction";

export default function ReleaseComments({
  releaseId,viewerId,initialOpen=false,compact=false
}:{releaseId:string;viewerId?:string;initialOpen?:boolean;compact?:boolean}){
  const [open,setOpen]=useState(initialOpen);
  const [comments,setComments]=useState<PublicReleaseComment[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
 const [deleting,setDeleting]=useState<Set<string>>(()=>new Set());
 const deleteLocks=useRef(new Set<string>()),posting=useRef(false),deletedLocally=useRef(new Set<string>()),loadRevision=useRef(0);
  const [error,setError]=useState(""),[loadError,setLoadError]=useState("");
  const [draft,setDraft]=useState("");
  const [replyTo,setReplyTo]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    const revision=++loadRevision.current;setLoading(true);
    try{const result=await backgroundInteraction<{ok:boolean;comments:PublicReleaseComment[];error?:string}>('commentsList',{releaseId});
      if(revision!==loadRevision.current)return;
      if(result.ok){setComments(result.comments.map(comment=>deletedLocally.current.has(comment.id)?{...comment,deleted:true,body:''}:comment));setLoaded(true);setLoadError('');}else setLoadError(result.error||'Unable to load comments.');
    }catch{if(revision===loadRevision.current)setLoadError('Comments could not be loaded. Reconnect and retry.');}
    finally{if(revision===loadRevision.current)setLoading(false);}
  },[releaseId]);

  useEffect(()=>{if(initialOpen)void refresh();},[initialOpen,refresh]);

  function toggle(){
    const next=!open;setOpen(next);
    if(next&&!loaded&&!loading)void refresh();
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.trim()||posting.current)return;
    posting.current=true;setBusy(true);setError('');
    const body=draft,parentId=replyTo;
    try{const result=await backgroundInteraction<{ok:boolean;error?:string}>('commentPost',{releaseId,body,parentId});
      if(result.ok){setDraft(current=>current===body?'':current);setReplyTo(current=>current===parentId?null:current);await refresh();}
      else setError(result.error||"Your comment wasn't posted.");
    }catch{setError('Your comment could not be posted. Your text is kept; retry when connected.');}
    finally{posting.current=false;setBusy(false);}
  }
  async function remove(id:string){
    if(deleteLocks.current.has(id))return;
    const previous=comments.find(comment=>comment.id===id);if(!previous)return;
    deleteLocks.current.add(id);deletedLocally.current.add(id);setDeleting(new Set(deleteLocks.current));setError('');
    setComments(items=>items.map(comment=>comment.id===id?{...comment,deleted:true,body:''}:comment));
    try{const result=await backgroundInteraction<{ok:boolean;error?:string}>('commentDelete',{id});
      if(!result.ok)throw new Error(result.error||'Could not delete the comment.');
    }catch(error){deletedLocally.current.delete(id);setComments(items=>items.map(comment=>comment.id===id?previous:comment));setError(error instanceof Error?error.message:'Could not delete comment.');}
    finally{deleteLocks.current.delete(id);setDeleting(new Set(deleteLocks.current));}
  }

  const rootComments=comments.filter(comment=>!comment.parentId);
  function renderComment(comment:PublicReleaseComment,isReply=false){
    const replies=isReply?[]:comments.filter(item=>item.parentId===comment.id);
    return <div className={"fm-comment"+(isReply?" fm-comment-reply":"")} key={comment.id}>
      <div className="fm-comment-avatar" aria-hidden="true">{comment.authorName.slice(0,1).toUpperCase()}</div>
      <div className="fm-comment-content">
        <div className="fm-comment-meta"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString("en-KE",{month:"short",day:"numeric",year:"numeric"})}</time></div>
        <p className={comment.deleted?"fm-comment-deleted":"fm-comment-body"}>{comment.deleted?"Comment deleted":comment.body}</p>
        {!comment.deleted&&<div className="fm-comment-tools">
          {!isReply&&viewerId&&<button type="button" onClick={()=>{setReplyTo(comment.id);setOpen(true);}}>Reply</button>}
          {viewerId===comment.authorId&&<button type="button" disabled={deleting.has(comment.id)} onClick={()=>void remove(comment.id)}>Delete</button>}
        </div>}
        {replies.length>0&&<div className="fm-comment-replies">{replies.map(reply=>renderComment(reply,true))}</div>}
      </div>
    </div>;
  }

  return <section className={"fm-comments"+(compact?" fm-comments-compact":"")} aria-label="Song comments">
    <button type="button" className="fm-comments-toggle" aria-expanded={open} onClick={toggle}>
      <span>◯ {compact?"Comment":"Comments"} {loaded?"("+comments.filter(comment=>!comment.deleted).length+")":""}</span>
      <span aria-hidden="true">{open?"−":"+"}</span>
    </button>
    {open&&<div className="fm-comments-panel">
      {viewerId?<form className="fm-comment-compose" onSubmit={submit}>
        {replyTo&&<div className="fm-comment-replying">Replying to {comments.find(comment=>comment.id===replyTo)?.authorName||"a listener"} <button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></div>}
        <label htmlFor={"fm-comment-"+releaseId}>{replyTo?"Write a reply":"Join the conversation"}</label>
        <textarea id={"fm-comment-"+releaseId} value={draft} onChange={event=>setDraft(event.target.value)}
          maxLength={600} rows={2} placeholder="What do you think of this track?" required/>
        <div className="fm-comment-compose-bottom"><small>{draft.length}/600</small><button disabled={busy||!draft.trim()} type="submit">{busy?"Posting…":replyTo?"Reply":"Post comment"}</button></div>
      </form>:<p className="fm-comments-join"><Link href={"/login?next="+encodeURIComponent("/billboard/"+releaseId)}>Sign in to comment or reply →</Link></p>}
      {(error||loadError)&&<div role="alert" className="fm-comments-error">{error||loadError} {loadError&&<button type="button" onClick={()=>void refresh()}>Retry loading comments</button>}</div>}
      {loading&&!loaded&&<p className="fm-comments-muted" role="status">Loading conversation…</p>}
      {loaded&&rootComments.length===0&&<p className="fm-comments-muted">No comments yet. Start the conversation about this track.</p>}
      {loaded&&rootComments.length>0&&<div className="fm-comments-list">{rootComments.map(comment=>renderComment(comment))}</div>}

    </div>}
  </section>;
}
