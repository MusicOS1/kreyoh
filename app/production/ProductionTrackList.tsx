'use client';

import {Children, useEffect, useState, type ReactNode} from 'react';
import styles from './Production.module.css';

type Track = {id: string; title: string; code: string; state: string};
const PAGE_SIZE = 8;

export default function ProductionTrackList({tracks, children}: {tracks: Track[]; children: ReactNode}) {
 const [query, setQuery] = useState('');
 const [status, setStatus] = useState('all');
 const [page, setPage] = useState(0);
 const rows = Children.toArray(children);
 const matching = tracks.map((track, index) => ({...track, index})).filter(track =>
  `${track.title} ${track.code}`.toLowerCase().includes(query.trim().toLowerCase()) &&
  (status === 'all' || (status === 'ready' ? track.state === 'Ready' : track.state !== 'Ready'))
 );
 const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
 const current = Math.min(page, pages - 1);
 const visible = new Set(matching.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map(track => track.index));

 // Preserve existing links to tracks, versions and uploaded files, including items on later pages.
 useEffect(() => {
  function reveal() {
   let id: string;
   try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
   const target = document.getElementById(id);
   const track = target?.closest<HTMLDetailsElement>('details[data-production-track], details[id^="track-"]');
   const index = tracks.findIndex(item => `track-${item.id}` === track?.id);
   if (!track || index < 0) return;
   setQuery(''); setStatus('all'); setPage(Math.floor(index / PAGE_SIZE));
   for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true;
   }
   requestAnimationFrame(() => target?.scrollIntoView({block: 'start'}));
  }
  reveal(); window.addEventListener('hashchange', reveal);
  return () => window.removeEventListener('hashchange', reveal);
 }, [tracks]);

 if (!tracks.length) return null;
 return <div className={styles.trackList}>
  <div className={styles.toolbar}>
   <label>Find a track<input type="search" placeholder="Search title or code" value={query} onChange={event => {setQuery(event.target.value); setPage(0);}}/></label>
   <label>Readiness<select aria-label="Readiness" value={status} onChange={event => {setStatus(event.target.value); setPage(0);}}><option value="all">All tracks</option><option value="attention">Needs attention</option><option value="ready">Ready</option></select></label>
   <span className={styles.meta} role="status">{matching.length} of {tracks.length} tracks</span>
  </div>
  <div className={styles.trackRows}>{rows.map((row, index) => <div key={tracks[index].id} hidden={!visible.has(index)}>{row}</div>)}</div>
  {!matching.length && <p>No tracks match. <button type="button" onClick={() => {setQuery(''); setStatus('all'); setPage(0);}}>Clear filters</button></p>}
  {pages > 1 && <nav className={styles.pagination} aria-label="Track pages"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current + 1} of {pages}</span><button type="button" disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Next</button></nav>}
 </div>;
}
