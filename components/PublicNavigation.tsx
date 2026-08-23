"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "./Icons";
import { FacktsMusicLogo } from "./Branding";

export default function PublicNavigation() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const links = [["Product","/#product"],["How It Works","/#workflow"],["About","/about"],["Partner With Us","/partner"],["Contact","/contact"]];
  return <header className="public-nav-wrap"><div className="public-nav"><Link href="/" className="public-brand" aria-label="FACKTS Music home" onClick={close}><FacktsMusicLogo size={38} showTagline={false}/></Link><nav className="public-nav-links" aria-label="Public navigation">{links.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}<Link href="/login">Sign In</Link><Link href="/signup" className="public-nav-cta">Create Account <ArrowUpRight size={14}/></Link></nav><button type="button" className={open?"public-menu-trigger is-open":"public-menu-trigger"} onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation"><span/><span/><span/></button></div><nav className={open?"public-mobile-menu is-open":"public-mobile-menu"} aria-label="Mobile navigation">{links.map(([label,href])=><Link key={label} href={href} onClick={close}>{label}</Link>)}<Link href="/login" onClick={close}>Sign In</Link><Link href="/signup" className="public-mobile-cta" onClick={close}>Create Account <ArrowUpRight size={15}/></Link></nav></header>;
}
