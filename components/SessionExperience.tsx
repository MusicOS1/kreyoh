"use client";
import {createContext,useContext,useEffect,useRef,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import Link from "next/link";
import {createClient} from "../lib/client";
import {safeNext} from "../lib/navigation";
import {readPreference,writePreference} from "../lib/listeningState";
type Identity={id:string;creator:boolean};
const SessionContext=createContext<{identity:Identity|null;ready:boolean}>({identity:null,ready:false});
export const useMusicIdentity=()=>useContext(SessionContext);
function clearMemberPreferences(){try{Object.keys(localStorage).filter(key=>(key.startsWith("fm-listening:")||key.startsWith("fm-return:")||key.startsWith("fm-context:"))&&!key.startsWith("fm-listening:public:")&&key!=="fm-context:public").forEach(key=>localStorage.removeItem(key));}catch{}}

export default function SessionExperience({children}:{children:React.ReactNode}) {
  const [identity,setIdentity]=useState<Identity|null>(null),[ready,setReady]=useState(false),[offline,setOffline]=useState(false),[resume,setResume]=useState("");
  const pathname=usePathname(),router=useRouter(),previousIdentity=useRef<string|null>(null);
  useEffect(()=>{if(!ready)return;if(previousIdentity.current&&previousIdentity.current!==identity?.id)router.refresh();previousIdentity.current=identity?.id||null;},[ready,identity?.id,router]);
  useEffect(()=>{if(identity&&pathname!=="/"&&!/^\/(auth|login|signup|forgot-password|set-password|api|admin\/login)(\/|$)/.test(pathname))writePreference(`fm-return:${identity.id}`,safeNext(location.pathname+location.search+location.hash));},[pathname,identity]);
  useEffect(()=>{
    setResume(identity?readPreference<string>(`fm-return:${identity.id}`)||"":"");
  },[identity?.id]);
  useEffect(()=>{
    if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){setReady(true);return;}
    let alive=true,revision=0;
    const supabase=createClient(); // SSR cookie storage; SDK owns token refresh and persistence.
    const check=async()=>{const current=++revision;try{const response=await fetch("/api/session/status",{cache:"no-store"});if(!response.ok)return;const result=await response.json();if(alive&&current===revision){if(!result.identity)clearMemberPreferences();setIdentity(previous=>previous?.id===result.identity?.id&&previous?.creator===result.identity?.creator?previous:result.identity);setReady(true);}}catch{/* A connection failure must not clear identity or cookies. */}};
    const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"){revision++;setIdentity(null);setReady(true);clearMemberPreferences();window.dispatchEvent(new Event("fm-signed-out"));}else if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED")void check();});
    const online=()=>{setOffline(false);void check();};
    const disconnected=()=>setOffline(true);
    const visible=()=>{if(document.visibilityState==="visible")void check();};
    setOffline(!navigator.onLine);void check();
    window.addEventListener("online",online);window.addEventListener("offline",disconnected);document.addEventListener("visibilitychange",visible);
    return()=>{alive=false;subscription.unsubscribe();window.removeEventListener("online",online);window.removeEventListener("offline",disconnected);document.removeEventListener("visibilitychange",visible);};
  },[]);
  return <SessionContext.Provider value={{identity,ready}}>{offline&&<div className="connection-notice" role="status">You’re offline. Reconnect to load music and save changes.</div>}{pathname==="/"&&identity&&<nav className="returning-actions" aria-label="Welcome back"><Link href="/fan">Continue Listening</Link><Link href="/fan?tab=My%20Library">My Library</Link>{identity.creator&&<><Link href="/home">My Workspace</Link><Link href="/projects">My Projects</Link></>}<Link href="/fan/profile">My Profile</Link>{resume&&safeNext(resume,"")&&<Link href={safeNext(resume)}>Continue where I left off →</Link>}</nav>}{children}</SessionContext.Provider>;
}
