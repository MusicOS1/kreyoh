"use client";

import {useEffect,useRef} from "react";
import {useConversation} from "./MemberConversation";

type Message={id:string;body:string;sender_id:string;created_at:string;read_at:string|null};
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()).join("")||"F";}
function dayKey(value:string){return new Date(value).toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric",timeZone:"Africa/Nairobi"});}
function clock(value:string){return new Date(value).toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Africa/Nairobi"});}

export default function ChatTimeline({messages:initialMessages,viewerId,otherName,avatarUrl}:{messages:Message[];viewerId:string;otherName:string;avatarUrl?:string|null}){
  const conversation=useConversation();
  const messages=conversation?.snapshot.messages||initialMessages;
  const scrollRef=useRef<HTMLDivElement>(null);
  const previousLatest=useRef("");
  useEffect(()=>{
    const container=scrollRef.current;if(!container)return;
    const latest=messages[messages.length-1]?.id||"";
    if(previousLatest.current===latest)return;
    // Preserve the reading position if the fan has scrolled up to older messages.
    const atBottom=container.scrollHeight-container.scrollTop-container.clientHeight<180;
    if(!previousLatest.current||atBottom)container.scrollTop=container.scrollHeight;
    previousLatest.current=latest;
  },[messages]);
  let previousDay="";
  return <section ref={scrollRef} className="fm-chat-timeline" aria-label={"Conversation with "+otherName} aria-live="polite" aria-relevant="additions">
    {!messages.length&&<div className="fm-chat-empty"><span aria-hidden="true">✦</span><strong>Every connection starts somewhere.</strong><p>Send your first message and start a conversation about the music.</p></div>}
    {messages.map(message=>{
      const mine=message.sender_id===viewerId,day=dayKey(message.created_at);
      const showDay=day!==previousDay;previousDay=day;
      return <div className="fm-chat-message-group" key={message.id}>
        {showDay&&<div className="fm-chat-day"><span>{day}</span></div>}
        <div className={"fm-chat-message-row"+(mine?" is-mine":"")}>
          {!mine&&<span className="fm-chat-sender-avatar" aria-hidden="true">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(otherName)}</span>}
          <article className="fm-chat-bubble">
            <p>{message.body}</p>
            <div className="fm-chat-bubble-meta"><time dateTime={message.created_at}>{clock(message.created_at)}</time>
              {mine&&<span aria-label={message.read_at?"Read":"Sent"} title={message.read_at?"Read":"Sent"} className={message.read_at?"is-read":""}>{message.read_at?"✓✓":"✓"}</span>}
            </div>
          </article>
        </div>
      </div>;
    })}
  </section>;
}
