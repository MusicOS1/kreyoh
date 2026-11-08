"use client";

import {useEffect,useRef,useState} from "react";
import {useConversation,type ChatReaction} from "./MemberConversation";
import {backgroundInteraction} from "../lib/backgroundInteraction";

type Message={id:string;body:string;sender_id:string;created_at:string;read_at:string|null;reply_to_id?:string|null};
const AVAILABLE=["❤️","🔥","😂","👏","👍","😮","😢","💯"] as const;
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()).join("")||"F";}
function dayKey(value:string){return new Date(value).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric",timeZone:"Africa/Nairobi"});}
function clock(value:string){return new Date(value).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Africa/Nairobi"});}

export default function ChatTimeline({messages:initialMessages,viewerId,otherName,avatarUrl}:{messages:Message[];viewerId:string;otherName:string;avatarUrl?:string|null}){
 const conversation=useConversation();
 const messages=conversation?.snapshot.messages||initialMessages;
 const reactions=conversation?.snapshot.reactions||[];
 const scrollRef=useRef<HTMLDivElement>(null);
 const previousLatest=useRef("");
 const[pending,setPending]=useState("");
 const[error,setError]=useState("");
 useEffect(()=>{
  const container=scrollRef.current;if(!container)return;
  const latest=messages[messages.length-1]?.id||"";
  if(previousLatest.current===latest)return;
  const atBottom=container.scrollHeight-container.scrollTop-container.clientHeight<180;
  if(!previousLatest.current||atBottom)container.scrollTop=container.scrollHeight;
  previousLatest.current=latest;
 },[messages]);
 async function react(messageId:string,emoji:string){
  if(pending)return;
  setPending(messageId);setError("");
  const form=new FormData();form.set("message_id",messageId);form.set("emoji",emoji);
  try{await backgroundInteraction("messageReaction",form);await conversation?.refresh();}
  catch{setError("Reaction could not be saved. Try again.");}
  finally{setPending("");}
 }
 let previousDay="";
 const wallpaper=conversation?.appearance.wallpaper||"studio";
 const photo=wallpaper==="custom"?conversation?.appearance.image:undefined;
 const byId=new Map(messages.map(message=>[message.id,message]));
 return <section ref={scrollRef} className={"fm-chat-timeline fm-wallpaper-"+wallpaper} style={photo?{backgroundImage:"linear-gradient(rgba(4,4,4,.40),rgba(4,4,4,.50)),url("+JSON.stringify(photo)+")",backgroundSize:"cover",backgroundPosition:"center"}:undefined} aria-label={"Conversation with "+otherName} aria-live="polite" aria-relevant="additions">
  {!messages.length&&<div className="fm-chat-empty"><span aria-hidden="true">✦</span><strong>Every connection starts somewhere.</strong><p>Send your first message and start a conversation about the music.</p></div>}
  {error&&<p role="alert" className="fm-chat-reaction-error">{error}</p>}
  {messages.map(message=>{
   const mine=message.sender_id===viewerId,day=dayKey(message.created_at);
   const showDay=day!==previousDay;previousDay=day;
   const quoted=message.reply_to_id?byId.get(message.reply_to_id):null;
   const onMessage=reactions.filter(reaction=>reaction.message_id===message.id);
   const mineReaction=onMessage.find(reaction=>reaction.user_id===viewerId)?.emoji;
   const counts=new Map<string,number>();
   for(const reaction of onMessage)counts.set(reaction.emoji,(counts.get(reaction.emoji)||0)+1);
   return <div className="fm-chat-message-group" key={message.id}>
    {showDay&&<div className="fm-chat-day"><span>{day}</span></div>}
    <div className={"fm-chat-message-row"+(mine?" is-mine":"")}>
     {!mine&&<span className="fm-chat-sender-avatar" aria-hidden="true">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(otherName)}</span>}
     <article className="fm-chat-bubble">
      {message.reply_to_id&&<div className="fm-chat-quote"><strong>{quoted?.sender_id===viewerId?"You":otherName}</strong><small>{quoted?.body||"Earlier message"}</small></div>}
      <p>{message.body}</p>
      <div className="fm-chat-bubble-meta"><time dateTime={message.created_at}>{clock(message.created_at)}</time>
       {mine&&<span aria-label={message.read_at?"Read":"Sent"} title={message.read_at?"Read":"Sent"} className={message.read_at?"is-read":""}>{message.read_at?"✓✓":"✓"}</span>}
      </div>
      {!!counts.size&&<div className="fm-chat-reaction-list">{Array.from(counts).map(([emoji,count])=><button key={emoji} type="button" aria-label={`${count} ${emoji} reactions`} title="Toggle your reaction" className={mineReaction===emoji?"is-selected":""} disabled={!!pending} onClick={()=>void react(message.id,emoji)}>{emoji} <small>{count}</small></button>)}</div>}
      <div className="fm-chat-message-actions">
       <button type="button" onClick={()=>conversation?.setReplyTarget({id:message.id,body:message.body,sender:mine?"You":otherName})}>Reply</button>
       <details className="fm-chat-react-menu"><summary>React</summary><div>{AVAILABLE.map(emoji=><button type="button" disabled={!!pending} key={emoji} aria-label={`React ${emoji}`} onClick={event=>{void react(message.id,emoji);event.currentTarget.closest("details")?.removeAttribute("open");}}>{emoji}</button>)}</div></details>
      </div>
     </article>
    </div>
   </div>;
  })}
 </section>;
}
