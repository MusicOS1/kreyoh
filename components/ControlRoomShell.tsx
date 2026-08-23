"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {FacktsMusicLogo} from "./Branding";
import InstallControlRoomButton from "./InstallControlRoomButton";
import {controlRoomLogout} from "../app/admin/actions";
import PresenceHeartbeat from "./PresenceHeartbeat";

const navigation=[
  {label:"Overview",href:"/admin",group:"Command"},
  {label:"People & access",href:"/admin/users",group:"Management"},
  {label:"Projects",href:"/admin/projects",group:"Management"},
  {label:"Music operations",href:"/admin/operations",group:"Operations"},
  {label:"Enquiries",href:"/admin/enquiries",group:"Operations"},
  {label:"Activity",href:"/admin/activity",group:"Intelligence"},
  {label:"Analytics",href:"/admin/analytics",group:"Intelligence"},
  {label:"System settings",href:"/admin/system",group:"Platform"},
];

export default function ControlRoomShell({email,children}:{email?:string;children:React.ReactNode}){
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  useEffect(()=>setMobileOpen(false),[pathname]);
  useEffect(()=>{document.body.style.overflow=mobileOpen?"hidden":"";return()=>{document.body.style.overflow=""}},[mobileOpen]);
  const isActive=(href:string)=>href==="/admin"?pathname==="/admin":pathname.startsWith(href);
  const sidebar=<><div className="control-sidebar-head"><span>CONTROL CENTRE</span><button type="button" onClick={()=>setMobileOpen(false)} aria-label="Close Control Room menu">×</button></div>{["Command","Management","Operations","Intelligence","Platform"].map(group=><div className="control-nav-group" key={group}><span className="control-nav-label">{group}</span>{navigation.filter(item=>item.group===group).map(item=><Link key={item.href} href={item.href} className={isActive(item.href)?"active":""}>{item.label}</Link>)}</div>)}<Link href="/workspace" className="control-open-platform">Open FACKTS Music ↗</Link><div className="control-sidebar-note"><span>PRIVATE</span><p>Server-authorised management access for the whole music system.</p></div><form action={controlRoomLogout} className="control-sidebar-logout"><button type="submit">Sign out</button></form></>;
  return <main className="control-room"><PresenceHeartbeat />
    <header className="control-topbar"><div className="control-brand"><FacktsMusicLogo size={42}/><span>CONTROL ROOM</span></div><button type="button" className="control-menu-trigger" onClick={()=>setMobileOpen(true)} aria-label="Open Control Room menu"><span/><span/><span/></button><div className="control-top-actions"><InstallControlRoomButton/><span className="control-admin-identity">{email}</span><form action={controlRoomLogout}><button type="submit" className="control-logout">Sign out</button></form></div></header>
    <div className={`control-nav-backdrop ${mobileOpen?"open":""}`} onClick={()=>setMobileOpen(false)}/>
    <div className="control-shell"><aside className={`control-sidebar ${mobileOpen?"open":""}`}>{sidebar}</aside><div className="control-content">{children}</div></div>
    <nav className="control-mobile-bottom-nav" aria-label="Control Room primary navigation"><Link className={isActive("/admin")?"active":""} href="/admin">Overview</Link><Link className={isActive("/admin/users")?"active":""} href="/admin/users">People</Link><Link className={isActive("/admin/operations")?"active":""} href="/admin/operations">Operations</Link><button type="button" onClick={()=>setMobileOpen(true)}>More</button></nav>
  </main>;
}
