"use client";

import {useCallback,useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {
  deleteReleaseComment,listReleaseComments,postReleaseComment,
  type PublicReleaseComment
} from "../app/release-comments/actions";

export default function ReleaseComments({
  releaseId,viewerId,initialOpen=false
}:{releaseId:string;viewerId?:string;initialOpen?:boolean}){
  const [open,setOpen]=useState(initialOpen);
  const [comments,setComments]=useState<PublicReleaseComment[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [draft,setDraft]=useState("");
  const [replyTo,setReplyTo]=useState<string|null>(null);

  const refresh=useCallback(async()=>{
    setLoading(true);
    const result=await listReleaseComments(releaseId);
    if(result.ok){setComments(result.comments);setLoaded(true);setError("");}
    else setError(result.error||"Unable to load comments.");
    setLoading(false);
  },[releaseId]);

  useEffect(()=>{if(initialOpen)void refresh();},[initialOpen,refresh]);

  function toggle(){
    const next=!open;setOpen(next);
    if(next&&!loaded&&!loading)void refresh();
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.trim()||busy)return;
    setBusy(true);setError("");
    const result=await postReleaseComment(releaseId,draft,replyTo);
    if(result.ok){setDraft("");setReplyTo(null);await refresh();}
    else setError(result.error||"Your comment wasn't posted.");
    setBusy(false);
  }
  async function remove(id:string){
    if(busy)return;
    setBusy(true);setError("");
    const result=await deleteReleaseComment(id);
    if(result.ok)await refresh();
    else setError(result.error||"Could not delete the comment.");
    setBusy(false);
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
          {!isReply&&viewerId&&<button type="button" disabled={busy} onClick={()=>{setReplyTo(comment.id);setOpen(true);}}>Reply</button>}
          {viewerId===comment.authorId&&<button type="button" disabled={busy} onClick={()=>void remove(comment.id)}>Delete</button>}
        </div>}
        {replies.length>0&&<div className="fm-comment-replies">{replies.map(reply=>renderComment(reply,true))}</div>}
      </div>
    </div>;
  }

  return <section className="fm-comments" aria-label="Song comments">
    <button type="button" className="fm-comments-toggle" aria-expanded={open} onClick={toggle}>
      <span>◯ &nbsp; Comments {loaded?"("+comments.filter(comment=>!comment.deleted).length+")":""}</span>
      <span aria-hidden="true">{open?"−":"+"}</span>
    </button>
    {open&&<div className="fm-comments-panel">
      {error&&<div role="alert" className="fm-comments-error">{error} <button type="button" onClick={()=>void refresh()}>Retry</button></div>}
      {loading&&!loaded&&<p className="fm-comments-muted" role="status">Loading conversation…</p>}
      {loaded&&rootComments.length===0&&<p className="fm-comments-muted">No comments yet. Start the conversation about this track.</p>}
      {loaded&&rootComments.length>0&&<div className="fm-comments-list">{rootComments.map(comment=>renderComment(comment))}</div>}
      {viewerId?<form className="fm-comment-compose" onSubmit={submit}>
        {replyTo&&<div className="fm-comment-replying">Replying to {comments.find(comment=>comment.id===replyTo)?.authorName||"a listener"} <button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></div>}
        <label htmlFor={"fm-comment-"+releaseId}>{replyTo?"Write a reply":"Join the conversation"}</label>
        <textarea id={"fm-comment-"+releaseId} value={draft} onChange={event=>setDraft(event.target.value)}
          maxLength={600} rows={2} placeholder="What do you think of this track?" required/>
        <div className="fm-comment-compose-bottom"><small>{draft.length}/600</small><button disabled={busy||!draft.trim()} type="submit">{busy?"Posting…":replyTo?"Reply":"Post comment"}</button></div>
      </form>:<p className="fm-comments-join"><Link href={"/login?next="+encodeURIComponent("/billboard/"+releaseId)}>Sign in to comment or reply →</Link></p>}
    </div>}
  </section>;
}
