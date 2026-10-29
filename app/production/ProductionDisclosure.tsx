'use client';

import {useEffect, useState, type ComponentProps} from 'react';

// Keep the current section open when an action refreshes its server-rendered content.
export default function ProductionDisclosure({children, id, ...props}: Omit<ComponentProps<'details'>, 'open' | 'onToggle'>) {
 const [open, setOpen] = useState(false);
 const [ready, setReady] = useState(false);
 const key = id ? `fm-production-section:${id}` : null;
 useEffect(() => {
  if (key) try {setOpen(sessionStorage.getItem(key) === 'open');} catch {}
  setReady(true);
 }, [key]);
 return <details {...props} id={id} open={open} data-disclosure-ready={ready} onToggle={event => {
  const expanded = event.currentTarget.open;
  setOpen(expanded);
  if (key && ready) try {sessionStorage.setItem(key, expanded ? 'open' : 'closed');} catch {}
 }}>{children}</details>;
}
