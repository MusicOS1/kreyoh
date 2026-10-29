import Link from 'next/link';
import AppShell from '../../components/AppShell';
import RecordBrowser from '../../components/RecordBrowser';
import {getWorkspace} from '../../lib/workspace';
import {loadProjectSessions} from '../../lib/sessionAccess';
import {readAllRows} from '../../lib/recordReads';
import {notificationLink} from '../../lib/navigation';
const first=(v:any)=>Array.isArray(v)?v[0]:v;
export default async function MemberDashboardPage(){
 const {admin,user,project,membership,roles}=await getWorkspace();
 if(!project||!membership)return <AppShell><div className="content"><h1>My Workspace</h1><Link href="/projects">Join or select a project →</Link></div></AppShell>;
 const [tasksR,sessionsR,noticesR,creditsR,splitsR,reviewsR]=await Promise.all([
  readAllRows(()=>admin.from('project_tasks').select('id,title,status,due_date,track_id').eq('project_id',project.id).eq('assignee_id',user.id).neq('status','done').order('due_date')),
  loadProjectSessions(admin,project.id,user.id,roles),
  admin.from('notifications').select('id,title,body,type,entity_type,entity_id,project_id,created_at').eq('user_id',user.id).is('read_at',null).order('created_at',{ascending:false}).limit(10),
  readAllRows(()=>admin.from('track_contributors').select('id,tracks(id,project_id,working_title,track_code,development_status)').eq('user_id',user.id).order('id')),
  admin.from('track_splits').select('id,track_id,percentage,tracks(working_title)').eq('project_id',project.id).eq('contributor_id',user.id).eq('status','awaiting_confirmation'),
  admin.from('project_assets').select('id,file_name,entity_id').eq('project_id',project.id).eq('review_assignee',user.id).eq('review_status','submitted').or(`visibility.in.(project,public),uploaded_by.eq.${user.id}`),
 ]);
 const tasks=tasksR.data||[],sessions=sessionsR.data||[],notices=noticesR.data||[];
 const tracks=[...new Map((creditsR.data||[]).map((c:any)=>first(c.tracks)).filter((t:any)=>t?.project_id===project.id).map((t:any)=>[t.id,t])).values()] as any[];
 const error=(r:any)=>r.error?<p role="alert">These records could not be loaded. Please retry.</p>:null;
 return <AppShell><div className="content operations-page"><div className="heading"><div><span className="eyebrow">{project.name} / MY WORK</span><h1>My Workspace</h1><p>What I need to do: my assignments, sessions and approvals.</p></div><Link href="/workspace">Open Project Room →</Link></div>
 <nav aria-label="Personal work tools"><Link href="/my-actions">My tasks</Link> · <Link href="/studio-sessions">Studio Sessions</Link> · <Link href="/production">Production reviews</Link> · <Link href="/inbox">Notifications</Link></nav>
 <section className="panel"><h2>My next action</h2>{tasksR.error?error(tasksR):tasks.length?<Link href={`/tasks#task-${tasks[0].id}`}>{tasks[0].title} →</Link>:<p>No open tasks assigned to you. Check your approvals and sessions below.</p>}</section>
 <section className="panel"><h2>My tasks</h2>{error(tasksR)||<RecordBrowser label="tasks" items={tasks.map((t:any)=>({id:`my-task-${t.id}`,title:t.title,status:t.status,date:t.due_date}))}>{tasks.map((t:any)=><Link key={t.id} href={`/tasks#task-${t.id}`}><strong>{t.title}</strong><p>{t.status} · {t.due_date||'No deadline'}</p></Link>)}</RecordBrowser>}</section>
 <section className="panel"><h2>My sessions</h2>{error(sessionsR)||<RecordBrowser label="sessions" timeFilter items={sessions.map((s:any)=>({id:`my-session-${s.id}`,title:first(s.tracks)?.working_title||'Project session',date:s.starts_at,status:s.status}))}>{sessions.map((s:any)=><Link key={s.id} href={`/studio-sessions#session-${s.id}`}><strong>{first(s.tracks)?.working_title||'Project session'}</strong><p>{new Date(s.starts_at).toLocaleString('en-KE')} · {s.status}</p></Link>)}</RecordBrowser>}</section>
 <section className="panel"><h2>My approvals</h2>{error(splitsR)||error(reviewsR)}{(splitsR.data||[]).map((s:any)=><p key={s.id}><Link href={`/splits?track=${s.track_id}`}>{first(s.tracks)?.working_title||'Track'} · Review {s.percentage}% split →</Link></p>)}{(reviewsR.data||[]).map((a:any)=><p key={a.id}><Link href={`/production#asset-${a.id}`}>Review {a.file_name} →</Link></p>)}{!splitsR.error&&!reviewsR.error&&!splitsR.data?.length&&!reviewsR.data?.length&&<p>No approvals awaiting you.</p>}</section>
 <section className="panel"><h2>My credited tracks</h2>{error(creditsR)||<RecordBrowser label="tracks" items={tracks.map(t=>({id:`my-track-${t.id}`,title:t.working_title,code:t.track_code,status:t.development_status}))}>{tracks.map(t=><Link key={t.id} href={`/track-records/${t.id}`}><strong>{t.working_title}</strong><p>{t.track_code} · {t.development_status}</p></Link>)}</RecordBrowser>}</section>
 <section className="panel"><h2>My notifications</h2>{error(noticesR)}{notices.map((n:any)=><p key={n.id}><Link href={notificationLink(n)}>{n.title} →</Link></p>)}{!noticesR.error&&!notices.length&&<p>No unread notifications.</p>}<Link href="/inbox">Open all notifications →</Link></section>
 </div></AppShell>;
}
