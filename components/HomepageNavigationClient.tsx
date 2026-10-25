"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMusicIdentity } from "./SessionExperience";
import { FacktsMusicLogo } from "./Branding";
import { ArrowUpRight } from "./Icons";
import styles from "./HomepageNavigation.module.css";

const primary = [["Explore Music", "/listen"], ["Creators", "/creators"], ["About", "/about"]] as const;
const secondary = [["How It Works", "/#how-it-works"], ["Partners", "/partner"], ["Contact", "/contact"]] as const;

export default function HomepageNavigationClient({ identity: initialIdentity }: { identity: { id: string; creator: boolean } | null }) {
  const { identity: clientIdentity, ready } = useMusicIdentity();
  const identity = ready ? clientIdentity : initialIdentity;
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const close = () => setOpen(false);
  useEffect(close, [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { close(); trigger.current?.focus(); } };
    const resize = () => close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); };
  }, [open]);
  return <header ref={header} className={styles.header} data-home-navigation onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(); }}>
    <div className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="FACKTS Music home" onClick={close}><FacktsMusicLogo size={38} showTagline={false} /></Link>
      <nav className={styles.primary} aria-label="Public navigation">
        {primary.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}
      </nav>
      <div className={styles.actions}>
        <Link className={styles.account} href={identity ? "/home" : "/login"}>{identity ? "My Workspace" : "Sign In"}</Link>
        <Link className={styles.cta} href={identity ? "/fan" : "/signup"}>{identity ? "Continue Listening" : "Join FACKTS"}<ArrowUpRight size={14} /></Link>
        <button ref={trigger} className={styles.trigger} aria-label="Toggle navigation" aria-expanded={open} aria-controls="homepage-menu" onClick={() => setOpen(value => !value)} onKeyDown={event => {
          if (event.key === "ArrowDown" && open) { event.preventDefault(); Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []).find(link => link.getClientRects().length > 0)?.focus(); }
        }}><span className={styles.menuLabel}>More</span><span aria-hidden="true">{open ? "×" : "☰"}</span></button>
      </div>
    </div>
    {open ? <nav id="homepage-menu" ref={panel} className={styles.panel} aria-label="More navigation">
      <div className={styles.mobilePrimary}>{primary.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}<ArrowUpRight size={16}/></Link>)}</div>
      {secondary.map(([label, href]) => <Link key={href} href={href} onClick={close}>{label}<ArrowUpRight size={16}/></Link>)}
      <div className={styles.panelAccount}>
        {identity ? <><Link href="/fan?tab=My%20Library" onClick={close}>My Library</Link><Link href="/home" onClick={close}>My Workspace</Link><Link href="/fan" onClick={close}>Continue Listening</Link></> : <><Link href="/login" onClick={close}>Sign In</Link><Link href="/signup" onClick={close}>Join FACKTS</Link></>}
      </div>
    </nav> : null}
  </header>;
}
