"use client";

import { useEffect, useState } from "react";
import {useMusicIdentity} from "./SessionExperience";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "./Icons";
import { FacktsMusicLogo } from "./Branding";

const links = [
  ["Discover music", "/listen"],
  ["Billboard", "/billboard"],
  ["Creators", "/creators"],
  ["How It Works", "/#how-it-works"],
  ["About", "/about"],
  ["Partner", "/partner"],
  ["Contact", "/contact"],
] as const;

export default function PublicNavigationClient({identity:initialIdentity}:{identity:{id:string;creator:boolean}|null}) {
  const {identity:clientIdentity,ready}=useMusicIdentity();
  const identity=ready?clientIdentity:initialIdentity;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[open]);

  return (
    <header className="public-nav-wrap fm-public-nav-wrap">
      <div className="public-nav fm-public-nav">
        <Link href="/" className="public-brand fm-public-brand" aria-label="FACKTS Music home" onClick={close}>
          <FacktsMusicLogo size={38} showTagline={false} />
        </Link>

        <nav className="public-nav-links fm-public-nav-links" aria-label="Public navigation">
          {links.map(([label, href]) => (
            <Link key={label} href={href} className={pathname === href ? "is-active" : ""}>
              {label}
            </Link>
          ))}
          {identity ? <><Link href="/fan?tab=My%20Library">My Library</Link><Link href={identity.creator?"/home":"/fan/profile"}>{identity.creator?"My Workspace":"My Profile"}</Link></> : <Link href="/login" className="fm-nav-signin">Sign In</Link>}
          <Link href={identity?"/fan":"/signup"} className="public-nav-cta fm-nav-cta">
            {identity?"Continue Listening":"Join FACKTS"} <ArrowUpRight size={14} />
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

      <nav id="fm-public-mobile-menu" className={open ? "public-mobile-menu is-open" : "public-mobile-menu"} aria-label="Mobile navigation">
        {links.map(([label, href]) => (
          <Link key={label} href={href} onClick={close}>{label}</Link>
        ))}
        {identity ? <><Link href="/fan?tab=My%20Library" onClick={close}>My Library</Link><Link href={identity.creator?"/home":"/fan/profile"} onClick={close}>{identity.creator?"My Workspace":"My Profile"}</Link></> : <Link href="/login" onClick={close}>Sign In</Link>}
        <Link href={identity?"/fan":"/signup"} className="public-mobile-cta" onClick={close}>
          {identity?"Continue Listening":"Join FACKTS"} <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
