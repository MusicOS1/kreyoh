"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import styles from "../app/finance-office/portal.module.css";

const nav=[
 {title:"Overview",href:"/finance-office"},
 {title:"FACKTS business finance",href:"/finance-office/platform"},
 {title:"Accounts",href:"/finance-office/accounts"},
 {title:"Partner: Third Culture",href:"/finance-office/partners/third-culture"},
 {title:"Third Culture members",href:"/finance-office/members"},
 {title:"Transactions",href:"/finance-office/transactions"},
 {title:"Bills & expenses",href:"/finance-office/bills"},
 {title:"Payments & links",href:"/finance-office/payments"},
 {title:"Create payment request",href:"/finance-office/payment-requests"},
 {title:"Fan payments",href:"/finance-office/fan-payments"},
 {title:"Reports",href:"/finance-office/reports"},
];
function sectionFor(path:string){
 if(path.startsWith("/finance-office/books/third_culture"))return "/finance-office/partners/third-culture";
 if(path.startsWith("/finance-office/books/fackts_music_platform")||path.startsWith("/finance-office/platform/"))return "/finance-office/platform";
 if(path.startsWith("/finance-office/projects/"))return "/finance-office/accounts";
 if(path.startsWith("/finance-office/members/"))return "/finance-office/members";
 if(path.startsWith("/finance-office/payments/"))return "/finance-office/payments";
 if(path==="/finance-office")return "/finance-office";
 const matching=nav.filter(x=>path===x.href||path.startsWith(x.href+"/")).sort((a,b)=>b.href.length-a.href.length);
 return matching[0]?.href||"/finance-office";
}
export default function FinancePortalShell({children,email,superAdmin}:{
 children:React.ReactNode;email:string;superAdmin:boolean;
}){
 const pathname=usePathname()||"/finance-office";
 const active=sectionFor(pathname);
 const [collapsed,setCollapsed]=useState(false);
 const [miniVisible,setMiniVisible]=useState(true);
 const [mobileMenu,setMobileMenu]=useState(false);
 useEffect(()=>{
  try{setCollapsed(localStorage.getItem("fm-finance-sidebar-collapsed")==="1");
      setMiniVisible(localStorage.getItem("fm-finance-mini-visible")!=="0");}catch{}
 },[]);
 useEffect(()=>{setMobileMenu(false);},[pathname]);
 const toggleSidebar=()=>{
  setCollapsed(x=>{const next=!x;try{localStorage.setItem("fm-finance-sidebar-collapsed",next?"1":"0");}catch{}return next;});
 };
 const toggleMini=()=>{
  setMiniVisible(x=>{const next=!x;try{localStorage.setItem("fm-finance-mini-visible",next?"1":"0");}catch{}return next;});
 };
 const links=(items:typeof nav)=>items.map(item=><Link key={item.href} href={item.href}
  aria-current={active===item.href?"page":undefined}
  className={active===item.href?styles.active:""} title={item.title}>
   <span className={styles.linkLabel}>{item.title}</span>
 </Link>);
 return <div className={styles.shell+" "+(collapsed?styles.collapsed:"")}>
  <aside className={styles.sidebar} aria-label="Finance portal sidebar">
   <div className={styles.sideHead}>
    {!collapsed&&<Link href="/finance-office" className={styles.brand}>FACKTS <span>MUSIC</span><small>Finance Office</small></Link>}
    <button type="button" className={styles.collapseButton} aria-expanded={!collapsed}
      aria-label={collapsed?"Expand Finance sidebar":"Collapse Finance sidebar"} title={collapsed?"Expand menu":"Collapse menu"}
      onClick={toggleSidebar}>{collapsed?"›":"‹"}</button>
   </div>
   <nav className={styles.links} aria-label="Finance portal navigation">{links(nav)}</nav>
   <div className={styles.foot}>
    {!collapsed&&<span>Signed in as {email}</span>}
    {superAdmin&&!collapsed&&<Link href="/admin">Open Super Admin Control Room</Link>}
    <form action="/auth/signout?next=/finance-office/login" method="post"><button type="submit" aria-label="Sign out of Finance Office">{collapsed?"↪":"Sign out"}</button></form>
   </div>
  </aside>
  <div className={styles.main}>
   <header className={styles.top}>
    <div><strong>FACKTS Music · Finance</strong><p>Business, partner and artist accounts stay separate</p></div>
    {superAdmin?<Link href="/admin">Super Admin</Link>:<span className={styles.role}>Finance team</span>}
   </header>
   <div className={styles.mobileTop}>
    <button type="button" onClick={()=>setMobileMenu(x=>!x)} aria-controls="finance-mobile-sections"
      aria-expanded={mobileMenu} className={styles.mobileMenuButton}>{mobileMenu?"Close sections":"☰ All finance sections"}</button>
    <span>{nav.find(x=>x.href===active)?.title||"Finance"}</span>
   </div>
   {mobileMenu&&<nav id="finance-mobile-sections" className={styles.mobileLinks}
     aria-label="All Finance Office sections">{links(nav)}</nav>}
   <div className={styles.body}>{children}</div>
   <div className={styles.mobileDock}>
    {miniVisible?<nav className={styles.mobileNav} aria-label="Finance portal mobile navigation">
      {links(nav.filter(x=>["/finance-office","/finance-office/platform","/finance-office/accounts","/finance-office/payments"].includes(x.href)))}
      <button type="button" className={styles.miniToggle} aria-label="Collapse Finance mini bar"
       onClick={toggleMini}>⌄<small>Hide</small></button>
     </nav>:
     <button type="button" className={styles.restoreMini} aria-label="Expand Finance mini bar"
       onClick={toggleMini}>☰ Finance menu</button>}
   </div>
  </div>
 </div>;
}
