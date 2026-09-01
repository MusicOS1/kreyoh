"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

export default function TrackReplacementEnhancer({enabled}:{enabled:boolean}){
  const pathname=usePathname();

  useEffect(()=>{
    if(!enabled||pathname!=="/tracks")return;

    const cards=Array.from(document.querySelectorAll<HTMLElement>(".track-development-card[id^='track-']"));
    const inserted:HTMLElement[]=[];

    cards.forEach(card=>{
      const id=card.id.replace(/^track-/,"");
      if(!id||card.querySelector("[data-track-replace-link]"))return;

      const actions=
        card.querySelector<HTMLElement>(".track-card-actions") ||
        card.querySelector<HTMLElement>(".operations-actions") ||
        card.querySelector<HTMLElement>("form")?.parentElement ||
        card;

      const link=document.createElement("a");
      link.href=`/tracks/${id}/replace`;
      link.dataset.trackReplaceLink="true";
      link.className="track-replace-link";
      link.textContent="Replace incomplete track";
      link.title="Replace this song inside the same track record instead of creating another track";
      actions.appendChild(link);
      inserted.push(link);
    });

    return()=>inserted.forEach(node=>node.remove());
  },[enabled,pathname]);

  if(!enabled)return null;

  return <style>{`
    .track-replace-link{
      display:inline-flex;
      min-height:38px;
      align-items:center;
      justify-content:center;
      margin-top:8px;
      padding:0 12px;
      border:1px solid rgba(249,115,22,.24);
      border-radius:10px;
      background:rgba(249,115,22,.07);
      color:#ff9a46;
      font-size:9px;
      font-weight:900;
      letter-spacing:.035em;
      text-transform:uppercase;
      text-decoration:none;
      transition:border-color .16s ease,background .16s ease,transform .16s ease;
    }
    .track-replace-link:hover{
      border-color:rgba(249,115,22,.48);
      background:rgba(249,115,22,.13);
      transform:translateY(-1px);
    }
  `}</style>;
}
