'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import localFont from 'next/font/local';
import { usePathname } from 'next/navigation';
import { useMusicIdentity } from './SessionExperience';
import { ArrowUpRight, DiscIcon, MusicIcon, UsersIcon, BriefcaseIcon } from './Icons';
import { FacktsMusicLogo } from './Branding';
import styles from './PublicNavigation.module.css';

// Self-hosted fonts belong to the shared header, not the surrounding page.
const bodyFont = localFont({src:'../public/fonts/ManropeVariable.ttf',variable:'--font-public-body',weight:'200 800',display:'swap'});
const displayFont = localFont({src:'../public/fonts/SoraVariable.ttf',variable:'--font-public-display',weight:'100 800',display:'swap',preload:false});

const links = [
  ['About', '/about'], ['How It Works', '/#how-it-works'],
  ['Creators', '/creators'], ['Explore Music', '/listen'],
  ['Partners', '/partner'], ['Contact', '/contact'],
] as const;
const musicLinks = [
  { title: 'Discover music', copy: 'Independent releases. Your next favourite.', href: '/listen', icon: MusicIcon },
  { title: 'Meet the artists', copy: 'The people and stories behind the sound.', href: '/creators', icon: UsersIcon },
  { title: 'The Billboard', copy: 'Listen, vote and champion a record.', href: '/billboard', icon: DiscIcon },
];

export default function PublicNavigationClient({ identity: initialIdentity }: { identity: { id: string; creator: boolean } | null }) {
  const { identity: live, ready } = useMusicIdentity();
  const identity = ready ? live : initialIdentity;
  const [open, setOpen] = useState(false), [explore, setExplore] = useState(false);
  const root = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null), mobileTrigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const close = () => { setOpen(false); setExplore(false); };
  useEffect(() => { setOpen(false); setExplore(false); }, [pathname]);
  useEffect(() => {
    if (!open && !explore) return;
    const outside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); (explore ? trigger : mobileTrigger).current?.focus(); } };
    const resize = () => close();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); };
  }, [open, explore]);
  const accountLinks = <>
    {identity ? <><Link href="/fan?tab=My%20Library" onClick={close}>My Library</Link><Link href="/home" onClick={close}>My Workspace</Link></> : <Link href="/login" onClick={close}>Sign In</Link>}
    <Link href={identity ? '/fan' : '/signup'} className={styles.cta} onClick={close}>{identity ? 'Continue Listening' : 'Join FACKTS'} <ArrowUpRight size={15} /></Link>
  </>;

  return <header className={`${styles.header} ${bodyFont.variable} ${displayFont.variable}`} ref={root} data-home-navigation data-public-navigation>
    <div className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="FACKTS Music home" onClick={close}><FacktsMusicLogo size={36} showTagline={false} /></Link>
      <nav className={styles.desktop} aria-label="Public navigation">
        <div className={styles.links}>{links.map(([label, href]) => <div className={styles.navItem} key={href}>
          <Link href={href} onClick={close} aria-current={pathname === href ? 'page' : undefined}>{label}</Link>
          {href === '/listen' && <button ref={trigger} type="button" className={styles.chevron} aria-label="Explore music menu" aria-expanded={explore} aria-controls="fm-explore-panel" onKeyDown={event => {
            if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey && explore)) {
              event.preventDefault();
              setExplore(true);
              const firstLink = root.current?.querySelector<HTMLAnchorElement>('#fm-explore-panel a');
              if (firstLink) firstLink.focus();
              else requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>('#fm-explore-panel a')?.focus());
            }
          }} onClick={() => setExplore(value => !value)}><span aria-hidden="true">⌄</span></button>}
        </div>)}</div>
        <div className={styles.account}>{accountLinks}</div>
      </nav>
      <button ref={mobileTrigger} type="button" className={styles.mobileTrigger} aria-controls="fm-public-mobile-menu" aria-expanded={open} aria-label="Toggle navigation" onClick={() => { setOpen(value => !value); setExplore(false); }}><span>{open ? 'Close' : 'Menu'}</span><span aria-hidden="true">{open ? '×' : '☰'}</span></button>
    </div>
    {explore && <nav id="fm-explore-panel" className={styles.mega} aria-label="Explore music">
      <div className={styles.musicGroup}><p className={styles.eyebrow}>FIND YOUR FREQUENCY</p>{musicLinks.map(({ title, copy, href, icon: Icon }) => <Link className={styles.menuLink} href={href} key={href} onClick={close}><span className={styles.icon}><Icon size={21} /></span><span><strong>{title}</strong><small>{copy}</small></span><ArrowUpRight size={16} /></Link>)}</div>
      <div className={styles.personalGroup}><p className={styles.eyebrow}>MAKE IT YOURS</p><Link className={styles.textLink} href="/fan?tab=My%20Library" onClick={close}><strong>Your music library</strong><small>Keep the records you come back to.</small></Link><Link className={styles.textLink} href="/home" onClick={close}><strong>Your creative workspace</strong><small>One account. A place for your craft.</small></Link><Link className={styles.textLink} href="/messages" onClick={close}><strong>Stay connected</strong><small>Continue the conversation.</small></Link>{!identity && <p className={styles.memberNote}>Sign in to collect music and connect.</p>}</div>
      <Link className={styles.feature} href="/about" onClick={close}><img src="/branding/fackts-creative-community.jpg" alt="" /><div><span className={styles.eyebrow}>THE FACKTS COMMUNITY</span><h2><span>More than<br />a listening room.</span></h2><p>Meet the creative world around the music.</p><span className={styles.featureCta}>Step inside <ArrowUpRight size={17} /></span></div></Link>
    </nav>}
    {open && <nav id="fm-public-mobile-menu" className={styles.mobile} aria-label="Mobile navigation">
      <p className={styles.eyebrow}>MUSIC. PEOPLE. POSSIBILITY.</p><div className={styles.mobileLinks}>{links.map(([label, href]) => <Link href={href} key={href} onClick={close} aria-current={pathname === href ? 'page' : undefined}>{label}<ArrowUpRight size={17} /></Link>)}</div>
      <div className={styles.mobileMusic}><Link href="/billboard" onClick={close}><DiscIcon size={18} />Billboard</Link><Link href="/home" onClick={close}><BriefcaseIcon size={18} />Your workspace</Link></div>
      <div className={styles.mobileAccount}>{accountLinks}</div>
    </nav>}
  </header>;
}
