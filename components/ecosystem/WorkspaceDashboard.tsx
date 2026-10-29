import RecordBrowser from "../RecordBrowser";
import Link from '../ProjectNavigationLink';
import { loadWorkspaceDashboard } from '../../lib/workspaceDashboard';
import {
  workspaceHref,
  type WorkspaceKind,
} from '../../lib/workspaceExperience';
import { projectLink } from '../../lib/navigation';
import EcosystemShell from './EcosystemShell';
import styles from './WorkspaceDashboard.module.css';
export default async function WorkspaceDashboard({
  kind,
}: {
  kind: WorkspaceKind;
}) {
  const { config, identity, projectIds, sections, metrics, projects, profile,trackRows,tracksUnavailable } =
    await loadWorkspaceDashboard(kind);
  return (
    <EcosystemShell active={kind}>
      <main className={styles.dashboard}>
        <div className={styles.topline}>
          <span>FACKTS MUSIC / {config.label.toUpperCase()}</span>
          <span>YOUR CREATIVE SPACE</span>
        </div>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              WELCOME BACK, {identity.name.split(' ')[0].toUpperCase()}
            </p>
            <h1>{config.title}</h1>
            <p>{config.intro}</p>
            <div className={styles.heroActions}>
              <Link
                href={workspaceHref(config.links[1]?.href || '/projects', kind)}
              >
                {config.focus} <span>↗</span>
              </Link>
              <Link href="/messages">Open messages →</Link>
            </div>
          </div>
          <div className={styles.identityCard}>
            {identity.avatar ? (
              <img src={identity.avatar} alt="" />
            ) : (
              <span className={styles.monogram}>
                {identity.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <small>{config.label.toUpperCase()}</small>
              <strong>{identity.name}</strong>
              <p>{profile?.location || 'FACKTS Music community'}</p>
              <Link href="/settings">Build my professional profile ↗</Link>
            </div>
          </div>
        </section>
        <section className={styles.metrics} aria-label="Your workspace summary">
          {metrics.map((metric) => (
            <Link href={workspaceHref(metric.href, kind)} key={metric.label}>
              <span>{metric.label}</span>
              <strong>
                {metric.value === null || metric.value === undefined
                  ? '—'
                  : metric.value}
              </strong>
              <small>
                {metric.value === null || metric.value === undefined
                  ? 'Temporarily unavailable'
                  : 'Open records ↗'}
              </small>
            </Link>
          ))}
        </section>
        {!projectIds.length && (
          <section className={styles.onboarding}>
            <div>
              <h2>Your next collaboration starts with a project.</h2>
              <p>
                Accept an invitation, join an open project or start your own.
                Private tools activate through the project permissions you
                receive.
              </p>
            </div>
            <Link href="/projects">Explore projects ↗</Link>
          </section>
        )}
        <section className={`${styles.panel} ${styles.recordings}`}><header><div><h2>My professional recordings</h2><p>Search the recordings in your selected project.</p></div></header>{tracksUnavailable?<p role="alert">Recordings could not be loaded. Try again.</p>:<div className={styles.catalogue}><RecordBrowser label="tracks" items={trackRows.map(row=>({id:`professional-track-${row.id}`,title:row.title,code:row.detail,status:row.status}))}>{trackRows.map(row=><Link prefetch={false} key={row.id} id={`professional-track-${row.id}`} href={row.href} className={styles.record}><span className={styles.recordCopy}><strong>{row.title}</strong><small>{row.detail}</small></span><span className={styles.status}>{row.status}</span></Link>)}</RecordBrowser></div>}</section>
        <section className={styles.grid}>
          {sections.filter(section=>!['Project recordings','Repertoire in development'].includes(section.title)).map((section) => (
            <article className={styles.panel} key={section.title}>
              <header>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.subtitle}</p>
                </div>
                <Link href={section.href}>View all ↗</Link>
              </header>
              <div className={styles.records}>
                {section.unavailable ? (
                  <div className={styles.empty} role="status">
                    <strong>Records temporarily unavailable</strong>
                    <p>
                      Try again in a moment. No empty or zero result has been
                      assumed.
                    </p>
                  </div>
                ) : section.rows.length ? (
                  section.rows.map((row, index) => (
                    <Link
                      prefetch={false}
                      href={row.href}
                      key={row.id}
                      className={styles.record}
                    >
                      <span className={styles.recordMark}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={styles.recordCopy}>
                        <strong>{row.title}</strong>
                        <small>{row.detail}</small>
                        {row.date && (
                          <time>
                            {new Date(row.date).toLocaleDateString('en-KE', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </time>
                        )}
                      </span>
                      {row.status && (
                        <span className={styles.status}>{row.status}</span>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className={styles.empty}>
                    <span aria-hidden="true">◇</span>
                    <strong>Nothing here yet.</strong>
                    <p>
                      Your {section.title.toLowerCase()} will appear as records
                      are added to the platform.
                    </p>
                    <Link href={section.href}>
                      Open {section.title.toLowerCase()} →
                    </Link>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
        <section className={styles.projectSection}>
          <header>
            <div>
              <span className={styles.eyebrow}>
                ONE CONNECTED CREATIVE ROOM
              </span>
              <h2>The projects behind the work.</h2>
            </div>
            <Link href="/projects">All my projects ↗</Link>
          </header>
          <div className={styles.projects}>
            {projects.map((project) => (
              <Link
                prefetch={false}
                href={projectLink(
                  project.id,
                  workspaceHref('/workspace', kind),
                )}
                key={project.id}
              >
                <span className={styles.projectArt}>
                  {project.artwork_url ? (
                    <img src={project.artwork_url} alt="" />
                  ) : (
                    <span aria-hidden="true">♫</span>
                  )}
                </span>
                <span className={styles.projectCopy}>
                  <small>{project.project_type || 'MUSIC PROJECT'}</small>
                  <strong>{project.name}</strong>
                  <span>
                    {project.current_stage || project.status || 'Project room'}
                  </span>
                  <p>
                    {project.next_action ||
                      'Open the shared project workspace.'}
                  </p>
                </span>
                <span className={styles.projectArrow}>↗</span>
              </Link>
            ))}
            {!projects.length && (
              <p className={styles.projectEmpty}>
                Your active project rooms will live here, with the same tracks,
                collaborators and records across every workspace.
              </p>
            )}
          </div>
        </section>
        {kind === 'visual' && (
          <aside className={styles.onboarding}>
            <div>
              <h2>Keep the brief and the delivery together.</h2>
              <p>
                Project documents accept files up to 25 MB and external
                production-folder links. A file upload is not an approval;
                per-edit media approvals are not available here yet.
              </p>
            </div>
            <Link href="/documents">Open project documents ↗</Link>
          </aside>
        )}
        <aside className={styles.note}>
          <span>YOUR WORK. ONE SOURCE OF TRUTH.</span>
          <p>
            Workspace choices organise your tools. Project membership, assigned
            roles and explicit relationships determine access.
          </p>
        </aside>
      </main>
    </EcosystemShell>
  );
}
