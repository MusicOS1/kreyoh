import Link from 'next/link';
import styles from './ProjectNavigation.module.css';

const sections = [
  {label: 'Music', href: '/production'},
  {label: 'Sessions', href: '/studio-sessions'},
  {label: 'People', href: '/people'},
] as const;

export default function ProjectNavigation({active, projectId}: {projectId: string; active: typeof sections[number]['label']}) {
  return (
    <nav aria-label="Project sections" className={styles.sections}>
      {sections.map(({label, href}) => (
        <Link key={href} prefetch={false} href={`/project-entry?project_id=${encodeURIComponent(projectId)}&next=${encodeURIComponent(href)}`} aria-current={active === label ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
