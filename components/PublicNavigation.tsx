"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "./Icons";
import { FacktsMusicLogo } from "./Branding";

const links = [
  ["Creators", "/creators"],
  ["How It Works", "/#how-it-works"],
  ["About", "/about"],
  ["Partner", "/partner"],
  ["Contact", "/contact"],
] as const;

export default function PublicNavigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

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
          <Link href="/login" className="fm-nav-signin">Sign In</Link>
          <Link href="/signup" className="public-nav-cta fm-nav-cta">
            Join FACKTS <ArrowUpRight size={14} />
          </Link>
        </nav>

        <button
          type="button"
          className={open ? "public-menu-trigger is-open" : "public-menu-trigger"}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className={open ? "public-mobile-menu is-open" : "public-mobile-menu"} aria-label="Mobile navigation">
        {links.map(([label, href]) => (
          <Link key={label} href={href} onClick={close}>{label}</Link>
        ))}
        <Link href="/login" onClick={close}>Sign In</Link>
        <Link href="/signup" className="public-mobile-cta" onClick={close}>
          Join FACKTS <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
