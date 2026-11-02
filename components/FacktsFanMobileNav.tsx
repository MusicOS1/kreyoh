"use client";
import {HomeIcon,UsersIcon,DiscIcon,ClockIcon,ActivityIcon} from "./Icons";
type Tab="For You"|"Artists"|"Albums & EPs"|"Shows"|"Billboard";
export default function FacktsFanMobileNav({active,onSelect}:{active:string;onSelect:(value:Tab)=>void}){
 const items=[{tab:"For You",label:"Discover",Icon:HomeIcon},{tab:"Artists",label:"Artists",Icon:UsersIcon},{tab:"Albums & EPs",label:"Albums",Icon:DiscIcon},{tab:"Shows",label:"Shows",Icon:ClockIcon},{tab:"Billboard",label:"Billboard",Icon:ActivityIcon}] as const;
 return <nav className="mx-fan-mobile-nav" aria-label="Mobile music navigation">{items.map(({tab,label,Icon})=><button key={tab} type="button" aria-current={active===tab?"page":undefined} onClick={()=>onSelect(tab)}><Icon size={20}/><span>{label}</span></button>)}</nav>;
}
