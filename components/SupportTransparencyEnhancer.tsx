"use client";

import {usePathname} from "next/navigation";

export default function SupportTransparencyEnhancer({roles}:{roles:string[]}){
  const pathname=usePathname();

  const supportRole=roles.some((role)=>["A&R","Manager","Studio Owner"].includes(role));
  const financeEditor=roles.some((role)=>["Super Admin","Admin","Project Lead","Finance"].includes(role));

  if(!supportRole||financeEditor||!pathname.startsWith("/finance"))return null;

  return<style>{`
    .operations-page .beat-intake-disclosure,
    .operations-page .platform-home-split > .beat-intake-disclosure{
      display:none!important;
    }
    .operations-page .heading::after{
      content:"SUPPORT VIEW · FINANCE IS READ-ONLY";
      display:inline-flex;
      align-items:center;
      min-height:30px;
      margin-top:12px;
      padding:0 11px;
      border:1px solid rgba(255,138,31,.28);
      border-radius:999px;
      background:rgba(255,138,31,.07);
      color:#ffad63;
      font-size:9px;
      font-weight:900;
      letter-spacing:.08em;
    }
  `}</style>;
}
