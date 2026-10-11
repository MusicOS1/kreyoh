"use client";

import Link from "next/link";

type Tab="For You"|"Artists"|"My Library";
function Icon({type}:{type:Tab|"Profile"|"Messages"}){
  return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {type==="For You"&&<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.6 5.1-4.4 1.9 2.1-4.6z"/></>}
    {type==="Artists"&&<><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20a6 6 0 0 1 12 0m0-5a5 5 0 0 1 8 5"/></>}{type==="My Library"&&<><path d="M4 5h12M4 10h12M4 15h9"/><rect x="15" y="14" width="5" height="7" rx="1"/><path d="M20 15v-5"/></>}
    {type==="Messages"&&<><path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8z"/><path d="M7 11h10M7 15h6"/></>}{type==="Profile"&&<><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>}
  </svg>;
}
const tabs:{key:Tab;label:string}[]=[
  {key:"For You",label:"Listen"},
  {key:"Artists",label:"Artists"},
  {key:"My Library",label:"Library"}
];
export default function FanMobileTabs({tab,onChange}:{tab:string;onChange:(tab:Tab)=>void}){
  return <nav className="fan-mobile-nav fan-listener-mobile-nav" aria-label="Listening portal shortcuts">
    {tabs.map(item=><button type="button" key={item.key} aria-current={tab===item.key?"page":undefined}
      onClick={()=>onChange(item.key)}><Icon type={item.key}/><span>{item.label}</span></button>)}
    <Link href="/messages"><Icon type="Messages"/><span>Chats</span></Link><Link href="/fan/profile"><Icon type="Profile"/><span>Profile</span></Link>
  </nav>;
}
