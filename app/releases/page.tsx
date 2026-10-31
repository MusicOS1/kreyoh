import Link from 'next/link';
import AppShell from '../../components/AppShell';
import RecordBrowser from '../../components/RecordBrowser';
import ReleaseWorkflowForm from '../../components/ReleaseWorkflowForm';
import {getWorkspace} from '../../lib/workspace';
import {releaseSchemaPending,releaseState,releaseTime} from '../../lib/releaseWorkflow';
export default async function Releases(){
 const {admin,project,membership}=await getWorkspace();
 if(!project||!membership)return <AppShell><div className="content"><h1>Project releases</h1><Link href="/projects">Select an authorised project →</Link></div></AppShell>;
 const [tracks,releases]=await Promise.all([admin.from('tracks').select('id,working_title').eq('project_id',project.id).order('working_title'),admin.from('music_releases').select('*').eq('source_project_id',project.id).order('created_at',{ascending:false})]);
 if(releases.error||tracks.error)return <AppShell><div className="content"><h1>Project releases</h1><p role="alert">{releaseSchemaPending(releases.error)?'Release workflow setup pending. The Session 4 migration must be approved and applied before this view can load.':'Release records could not be loaded. Please retry.'}</p><Link href="/billboard/submit">Existing release uploads →</Link></div></AppShell>;
 const rows=releases.data||[];
 return <AppShell><main className="content"><div className="heading"><div><h1>Project releases</h1><p>{project.code} · {project.name}</p></div><Link href="/billboard/submit">Independent release upload →</Link></div>
 <details className="panel"><summary>Prepare from a project track</summary><p>Use an approved master and artwork from Production. Source files stay private.</p><ReleaseWorkflowForm id={crypto.randomUUID()} action="create" label="Prepare release"><label>Track<select aria-label="Track" name="track_id" required><option value="">Choose track</option>{tracks.data?.map(t=><option key={t.id} value={t.id}>{t.working_title}</option>)}</select></label></ReleaseWorkflowForm></details>
 <h2>Release status</h2><RecordBrowser label="releases" items={rows.map(r=>({id:r.id,title:r.title,status:releaseState(r),date:r.release_at}))}>{rows.map(r=><Link key={r.id} id={r.id} href={'/releases/'+r.id}><span><strong>{r.title}</strong><small>{r.artist_name} · {releaseTime(r.release_at)}</small></span><span>{releaseState(r)}</span></Link>)}</RecordBrowser>
 </main></AppShell>;
}
