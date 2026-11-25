import Link from "next/link";
import {selectProject} from "../app/projects/actions";
import styles from "./ProjectTracksNavigator.module.css";
type ProjectChoice={id:string;name?:string;code?:string};
export default function ProjectTracksNavigator({projects,currentProjectId}:{
  projects:ProjectChoice[];currentProjectId?:string|null;
}){
 const selected=projects.find(item=>item.id===currentProjectId);
 return <section className={styles.root} aria-label="Choose project tracks">
   <div className={styles.intro}>
     <span className={styles.kicker}>YOUR PROJECT MUSIC</span>
     <h2>{selected?.name||"Choose a project"}</h2>
     <p>Each project has its own tracks and listening queue. Switch projects to hear that project's recordings.</p>
   </div>
   <div className={styles.actions}>
     {projects.length?<form action={selectProject} className={styles.form}>
       <input type="hidden" name="next" value="/tracks"/>
       <label htmlFor="artist-project-tracks-select">Choose a project</label>
       <select id="artist-project-tracks-select" key={currentProjectId||"none"} name="project_id" defaultValue={selected?.id||projects[0].id}>
         {projects.map(item=><option key={item.id} value={item.id}>{item.name||item.code||"Untitled project"}</option>)}
       </select>
       <button type="submit">Open project tracks</button>
     </form>:<Link className={styles.create} href="/projects">Explore or create projects →</Link>}
     {selected&&<nav className={styles.links} aria-label="Project recording shortcuts">
       <Link href="/tracks#project-player">Listen to this project</Link>
       <Link href="/tracks#project-tracks">Find a track</Link>
       <Link href="/production">Production workspace</Link>
     </nav>}
   </div>
 </section>;
}
