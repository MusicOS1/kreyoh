"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {FacktsMusicLogo} from "./Branding";
import InstallControlRoomButton from "./InstallControlRoomButton";
import {controlRoomLogout} from "../app/admin/actions";
import PresenceHeartbeat from "./PresenceHeartbeat";

const navigation=[
  ["Overview","/admin"],
  ["Users","/admin/users"],
  ["Projects","/admin/projects"],
  ["Activity","/admin/activity"],
  ["Analytics","/admin/analytics"],
  ["System","/admin/system"],
];

export default function ControlRoomShell({email,children}:{email?:string;children:React.ReactNode}){
  const pathname=usePathname();
  return <main className="control-room"><PresenceHeartbeat />
    <header className="control-topbar"><div className="control-brand"><FacktsMusicLogo size={42}/><span>CONTROL ROOM</span></div><div className="control-top-actions"><InstallControlRoomButton/><span className="control-admin-identity">{email}</span><form action={controlRoomLogout}><button type="submit" className="control-logout">Sign Out</button></form></div></header>
    <div className="control-shell"><aside className="control-sidebar"><span className="control-nav-label">MANAGEMENT</span>{navigation.map(([label,href])=><Link key={href} href={href} className={pathname===href?"active":""}>{label}</Link>)}<div className="control-sidebar-note"><span>PRIVATE</span><p>Server-authorised management access.</p></div></aside><div className="control-content">{children}</div></div>
  </main>;
}
