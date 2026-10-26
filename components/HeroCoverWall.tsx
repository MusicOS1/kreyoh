'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './HeroCoverWall.module.css';

const photography = [
  '/branding/fackts-creative-community.jpg',
  '/branding/fackts-creator-red-wide.jpg',
  '/branding/fackts-creator-sky.jpg',
  '/branding/fackts-monnokid-workspace.jpg',
];

/** Decorative artwork only. The root player remains the sole music transport. */
export default function HeroCoverWall({ covers, source = 'releases' }: { covers: string[]; source?: 'releases' | 'curated' }) {
  const wall = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false), [inView, setInView] = useState(false);
  const [foreground, setForeground] = useState(true), [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setForeground(document.visibilityState === 'visible');
    motion(); visibility();
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false));
    if (wall.current && observer) observer.observe(wall.current);
    else setInView(true);
    return () => { observer?.disconnect(); media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const images = covers.length ? covers.slice(0, 12) : photography;
  return <>
    <div ref={wall} className={styles.wall} aria-hidden="true" data-running={!paused && inView && foreground && !reduced} data-artwork={covers.length ? source : 'photography'}>
      {Array.from({ length: 5 }, (_, lane) => <div className={styles.lane} key={lane}>
        <div className={styles.track}>
          {[0, 1].map(copy => <div className={styles.group} key={copy}>
            {Array.from({ length: 4 }, (_, tile) => <div className={styles.cover} key={tile}>
              <img src={images[(lane * 4 + tile) % images.length]} alt="" width={280} height={280} decoding="async" fetchPriority="low" loading={copy === 0 && tile < 2 ? 'eager' : 'lazy'} draggable={false} />
            </div>)}
          </div>)}
        </div>
      </div>)}
    </div>
    <button type="button" className={styles.control} disabled={reduced} aria-label={reduced ? 'Background motion disabled by your device preference' : paused ? 'Play background artwork' : 'Pause background artwork'} aria-pressed={paused || reduced} onClick={() => setPaused(value => !value)}>
      <span aria-hidden="true">{paused || reduced ? '▷' : 'Ⅱ'}</span>{reduced ? 'Reduced motion' : paused ? 'Play artwork' : 'Pause artwork'}
    </button>
  </>;
}
