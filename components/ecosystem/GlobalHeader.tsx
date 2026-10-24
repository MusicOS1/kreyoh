'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BellIcon, MenuIcon } from '../Icons';
import { FacktsMusicLogo } from '../Branding';
import { useMusicIdentity } from '../SessionExperience';
import { switchWorkspace } from '../../app/workspaces/actions';
import { safeNext } from '../../lib/navigation';
import { readPreference } from '../../lib/listeningState';
import type {
  HeaderIdentity,
  WorkspaceKind,
} from '../../lib/workspaceExperience';
import styles from './GlobalHeader.module.css';
export default function GlobalHeader({
  identity: initialIdentity = null,
  active = 'listener',
  onMenu,
}: {
  identity?: HeaderIdentity | null;
  active?: WorkspaceKind;
  onMenu?: () => void;
}) {
  const { identity: live, ready } = useMusicIdentity();
  const identity = ready ? live : initialIdentity;
  const creatorWorkspace = identity?.workspaces.find(item => item.kind === 'artist') || identity?.workspaces.find(item => !['listener', 'admin'].includes(item.kind));
  const [open, setOpen] = useState(false),
    [resume, setResume] = useState('');
  const [installPrompt, setInstallPrompt] = useState<
      | (Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string }>;
        })
      | null
    >(null),
    [installHelp, setInstallHelp] = useState(false),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const ready = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(
        event as Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string }>;
        },
      );
    };
    const done = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    setResume(
      identity
        ? safeNext(readPreference<string>(`fm-return:${identity.id}`), '')
        : '',
    );
  }, [identity?.id, open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <header className={styles.header} data-fm-header>
      <div className={styles.brandGroup}>
        {onMenu && (
          <button
            className={styles.menuButton}
            type="button"
            aria-label="Toggle workspace navigation"
            onClick={onMenu}
          >
            <MenuIcon size={18} />
          </button>
        )}
        <Link
          href="/"
          aria-label="FACKTS Music home"
          className={styles.brand}
        >
          <FacktsMusicLogo size={36} showTagline={false} />
        </Link>
        <span className={styles.edition}>MUSIC · PEOPLE · POSSIBILITY</span>
      </div>
      <nav className={styles.navigation} aria-label="Global navigation">
        <Link href={identity ? '/fan' : '/listen'}>Discover</Link>
        <Link href={identity ? '/fan?tab=Artists' : '/creators'}>Artists</Link>
        <Link href="/billboard">Billboard</Link>
        {identity && <Link href="/fan?tab=My%20Library">Library</Link>}
      </nav>
      <div className={styles.actions}>
        {identity ? (
          <>
            {active === 'listener' && creatorWorkspace && (
              <Link className={styles.workspaceShortcut} href={creatorWorkspace.href}>
                {creatorWorkspace.kind === 'artist' ? 'Artist workspace' : 'My workspace'}
              </Link>
            )}
            <Link
              href="/inbox"
              className={styles.inbox}
              aria-label={`Notifications${identity.unread ? `: ${identity.unread} unread` : ''}`}
            >
              <BellIcon size={18} />
              {identity.unread > 0 && (
                <span>{Math.min(identity.unread, 99)}</span>
              )}
            </Link>
            <div className={styles.account} ref={root}>
              <button
                ref={trigger}
                type="button"
                className={styles.accountButton}
                aria-label="Open account and workspaces"
                aria-expanded={open}
                aria-controls="fm-account-panel"
                onClick={() => setOpen((value) => !value)}
              >
                <span className={styles.avatar}>
                  {identity.avatar ? (
                    <img src={identity.avatar} alt="" />
                  ) : (
                    identity.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className={styles.name}>{identity.name}</span>
                <span aria-hidden="true">⌄</span>
              </button>
              {open && (
                <div
                  className={styles.panel}
                  id="fm-account-panel"
                  aria-label="Account and workspaces"
                >
                  <div className={styles.identity}>
                    <strong>{identity.name}</strong>
                    <small>One account. Your music and your work.</small>
                  </div>
                  <div className={styles.personal}>
                    <Link
                      href="/fan?tab=My%20Library"
                      onClick={() => setOpen(false)}
                    >
                      My library
                    </Link>
                    <Link href="/projects" onClick={() => setOpen(false)}>
                      My projects
                    </Link>
                    <Link href="/fan/profile" onClick={() => setOpen(false)}>
                      My profile
                    </Link>
                    <Link href="/messages" onClick={() => setOpen(false)}>
                      Messages
                    </Link>
                    {resume && resume !== pathname && (
                      <Link href={resume} onClick={() => setOpen(false)}>
                        Continue where I left off ↗
                      </Link>
                    )}
                  </div>
                  <p className={styles.label}>YOUR WORKSPACES</p>
                  <form action={switchWorkspace} className={styles.workspaces}>
                    {identity.workspaces.map((item) => (
                      <button
                        type="submit"
                        name="workspace"
                        value={item.kind}
                        key={item.kind}
                        aria-current={active === item.kind ? 'page' : undefined}
                      >
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <span aria-hidden="true">
                          {active === item.kind ? '●' : '↗'}
                        </span>
                      </button>
                    ))}
                  </form>
                  <div className={styles.secondary}>
                    <Link href="/">Public website</Link>
                    <Link href="/settings">Settings</Link>
                    <Link href="/help">Help</Link>
                  </div>
                  {!installed && (
                    <button
                      type="button"
                      className={styles.install}
                      onClick={async () => {
                        if (installPrompt) {
                          await installPrompt.prompt();
                          await installPrompt.userChoice;
                          setInstallPrompt(null);
                        } else setInstallHelp(true);
                      }}
                    >
                      Install FACKTS Music ↗
                    </button>
                  )}
                  {installHelp && (
                    <p className={styles.installHelp}>
                      Use your browser’s Install app or Add to Home Screen
                      option. On iPhone, open Share in Safari, then Add to Home
                      Screen.
                    </p>
                  )}
                  <form action="/auth/signout" method="post">
                    <button className={styles.signout}>Sign out</button>
                  </form>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link className={styles.signin} href="/login">
              Sign in
            </Link>
            <Link className={styles.join} href="/signup">
              Join FACKTS ↗
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
