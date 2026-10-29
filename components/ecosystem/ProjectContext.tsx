import {selectProject} from '../../app/projects/actions';
import styles from './ProjectContext.module.css';
export default function ProjectContext({projects,projectId,next}:{projects:{id:string;code?:string;name?:string}[];projectId?:string;next:string}){
 const current=projects.find(project=>project.id===projectId);
 return <section className={`${styles.context} ${next.startsWith('/workspaces/') ? styles.inset : ''}`} aria-label="Current project">
  <div><small>CURRENT PROJECT</small><strong>{current ? `${current.code} — ${current.name}` : 'No active project selected'}</strong></div>
  {!!projects.length && <form action={selectProject}>
   <input type="hidden" name="next" value={next}/>
   <div><label htmlFor="current-project-select">Switch project</label><select id="current-project-select" key={projectId} name="project_id" defaultValue={projectId}>{projects.map(project=><option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></div>
   <button>Open selected project</button>
  </form>}
 </section>;
}
