'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GlobalHeader from './GlobalHeader';
import { selectProject } from '../../app/projects/actions';
import {
  workspaceConfig,
  workspaceHref,
  type HeaderIdentity,
  type WorkspaceKind,
} from '../../lib/workspaceExperience';
import styles from './EcosystemFrame.module.css';
export default function EcosystemFrame({
  identity,
  active = 'listener',
  projects = [],
  projectId,
  canManageFinance = false,
  children,
}: {
  identity: HeaderIdentity | null;
  active?: WorkspaceKind;
  projects?: { id: string; name?: string; code?: string }[];
  projectId?: string | null;
  canManageFinance?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    pathname = usePathname(),
    searchParams = useSearchParams(),
    config = workspaceConfig(active) || workspaceConfig('creative')!;
  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem('fackts-music-workspace-menu-collapsed') === '1',
      );
    } catch {}
  }, []);
  const toggleNavigation = () => {
    if (window.matchMedia('(min-width:761px)').matches) {
      const next = !collapsed;
      setCollapsed(next);
      try {
        localStorage.setItem(
          'fackts-music-workspace-menu-collapsed',
          next ? '1' : '0',
        );
      } catch {}
    } else setOpen(true);
  };
  const listening = active === 'listener';
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      document.body.style.overflow = previous;
    };
  }, [open]);
  const matches = (href: string) => {
    const url = new URL(href, 'https://fackts.invalid');
    return (
      pathname === url.pathname &&
      [...url.searchParams].every(
        ([key, value]) => searchParams.get(key) === value,
      ) &&
      (url.pathname !== '/fan' ||
        url.searchParams.has('tab') ||
        !searchParams.get('tab') ||
        searchParams.get('tab') === 'For You')
    );
  };
  const navigationLinks = canManageFinance && !config.links.some(link => link.href === '/finance') ? [...config.links, {label: 'Finance', href: '/finance'}] : config.links;
  const nav = (
    <>
      <div className={styles.context}>
        <span>YOUR WORKSPACE</span>
        <strong>{config.label}</strong>
        <small>{config.description}</small>
      </div>
      <nav aria-label="Workspace navigation" className={styles.links}>
        {navigationLinks.map((link, index) => (
          <Link
            key={link.label}
            href={workspaceHref(link.href, active)}
            aria-current={matches(link.href) ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            <span aria-hidden="true">
              {['◈', '♫', '▦', '◷', '◇', '↗'][index % 6]}
            </span>
            {link.label}
          </Link>
        ))}
      </nav>
      {projects.length > 0 && (
        <form action={selectProject} className={styles.project}>
          <label htmlFor="fm-project-select">PROJECT CONTEXT</label>
          <select
            name="project_id"
            id="fm-project-select"
            key={projectId}
            defaultValue={projectId || projects[0].id}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.code}
              </option>
            ))}
          </select>
          <button>Open project ↗</button>
        </form>
      )}
      <div className={styles.secondary}>
        <Link href="/messages">Messages</Link>
        <Link href="/inbox">
          Notifications{identity?.unread ? ` · ${identity.unread}` : ''}
        </Link>
        <Link href="/professional-record">My professional record</Link>
        <Link href="/professional-onboarding">Professional onboarding</Link>
        <Link href="/help">Help & guidance</Link>
      </div>
      <Link href="/fan" className={styles.listen}>
        ♫ Back to listening <span>↗</span>
      </Link>
    </>
  );
  const bottom = listening
    ? [
        { label: 'Discover', href: '/fan' },
        { label: 'Artists', href: '/fan?tab=Artists' },
        { label: 'Library', href: '/fan?tab=My%20Library' },
        { label: 'Messages', href: '/messages' },
      ]
    : [
        { label: 'Overview', href: config.href },
        { label: 'Projects', href: '/projects' },
        { label: 'My actions', href: '/my-actions' },
        { label: 'Listen', href: '/fan' },
      ];
  return (
    <div className={styles.frame} data-fm-workspace={active}>
      <GlobalHeader
        identity={identity}
        active={active}
        onMenu={listening ? undefined : toggleNavigation}
      />
      <div
        className={listening ? styles.listening : styles.layout}
        data-collapsed={collapsed}
      >
        {!listening && (
          <>
            <aside className={styles.sidebar}>{nav}</aside>
            {open && (
              <>
                <button
                  className={styles.backdrop}
                  aria-label="Close workspace navigation"
                  onClick={() => setOpen(false)}
                />
                <aside
                  className={styles.drawer}
                  aria-label="Mobile workspace navigation"
                >
                  <button
                    type="button"
                    className={styles.close}
                    onClick={() => setOpen(false)}
                  >
                    Close ×
                  </button>
                  {nav}
                </aside>
              </>
            )}
          </>
        )}
        <div className={styles.canvas}>{children}</div>
      </div>
      <nav className={styles.bottom} aria-label="Mobile primary navigation">
        {bottom.map((item, index) => (
          <Link
            key={item.label}
            href={workspaceHref(item.href, active)}
            aria-current={matches(item.href) ? 'page' : undefined}
          >
            <span aria-hidden="true">{['◈', '▦', '◇', '♫'][index]}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
