"use client";

import { useEffect, useRef, useState } from "react";
import {useMusicIdentity} from "./SessionExperience";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "./Icons";
import { FacktsMusicLogo } from "./Branding";

const primaryLinks = [
  ["Discover", "/listen"],
  ["Creators", "/creators"],
  ["How it works", "/#how-it-works"],
] as const;

const aboutLinks = [
  ["About", "/about"],
  ["Partners", "/partner"],
  ["Contact", "/contact"],
] as const;

export default function PublicNavigationClient({identity:initialIdentity}:{identity:{id:string;creator:boolean}|null}) {
  const {identity:clientIdentity,ready}=useMusicIdentity();
  const identity=ready?clientIdentity:initialIdentity;
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const close = () => {setOpen(false);if(moreRef.current)moreRef.current.open=false;};
  useEffect(()=>{setOpen(false);if(moreRef.current)moreRef.current.open=false;},[pathname]);
  useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[open]);

  return (
    <header className="public-nav-wrap fm-public-nav-wrap">
      <div className="public-nav fm-public-nav">
        <Link href="/" className="public-brand fm-public-brand" aria-label="FACKTS Music home" onClick={close}>
          <FacktsMusicLogo size={38} showTagline={false} />
        </Link>

        <nav className="public-nav-links fm-public-nav-links" aria-label="Public navigation">
          {primaryLinks.map(([label,href])=>(
            <Link key={label} href={href} className={pathname===href?"is-active":""}>{label}</Link>
          ))}
          <details className="fm-public-more" ref={moreRef}>
            <summary>More <span aria-hidden="true">⌄</span></summary>
            <div className="fm-public-more-list">
              {aboutLinks.map(([label,href])=><Link key={label} href={href} onClick={close}>{label}</Link>)}
              {identity&&<><Link href="/fan?tab=My%20Library" onClick={close}>My Library</Link>
                <Link href="/home" onClick={close}>My Workspace</Link></>}
            </div>
          </details>
          {!identity&&<Link href="/login" className="fm-nav-signin">Sign in</Link>}
          <Link href={identity?"/fan":"/signup"} className="public-nav-cta fm-nav-cta">
            {identity?"Continue listening":"Join FACKTS"} <ArrowUpRight size={15}/>
          </Link>
        </nav>

        <button
          type="button"
          className={open ? "public-menu-trigger is-open" : "public-menu-trigger"}
          onClick={() => setOpen(!open)}
          aria-controls="fm-public-mobile-menu"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav id="fm-public-mobile-menu" className={open ? "public-mobile-menu is-open" : "public-mobile-menu"}
        aria-label="Mobile navigation" aria-hidden={!open} inert={!open}>
        {primaryLinks.map(([label,href])=><Link key={label} href={href} onClick={close}>{label}</Link>)}
        {aboutLinks.map(([label,href])=><Link key={label} href={href} onClick={close}>{label}</Link>)}
        {identity?<><Link href="/fan?tab=My%20Library" onClick={close}>My Library</Link>
          <Link href="/home" onClick={close}>My Workspace</Link></>:
          <Link href="/login" onClick={close}>Sign in</Link>}
        <Link href={identity?"/fan":"/signup"} className="public-mobile-cta" onClick={close}>
          {identity?"Continue listening":"Join FACKTS"} <ArrowUpRight size={15}/>
        </Link>
      </nav>
    </header>
  );
}
