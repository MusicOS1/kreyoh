import Link from 'next/link';
import AppShell from '../../../components/AppShell';
import ReleaseWorkflowForm from '../../../components/ReleaseWorkflowForm';
import {releaseAccess,releaseState,releaseTime} from '../../../lib/releaseWorkflow';
import {hasAnyRole} from '../../../lib/workspace';
import {creatorDisplayName} from '../../../lib/profileIdentity';
const first=(v:any)=>Array.isArray(v)?v[0]:v;
export default async function ReleaseDetail({params}:{params:Promise<{releaseId:string}>}){
 let access;try{access=await releaseAccess((await params).releaseId);}catch(e){return <AppShell><div className="content"><h1>Release unavailable</h1><p role="alert">{e instanceof Error?e.message:'Release unavailable.'}</p></div></AppShell>;}
 const {admin,release:r,user,reviewer,memberships,project}=access;
 const roles=memberships.find((m:any)=>m.project_id===r.source_project_id)?.roles||[];
 const editor=project?.id===r.source_project_id&&(r.submitted_by===user.id||r.artist_id===user.id||hasAnyRole(roles,['Super Admin','Admin','Project Lead','A&R','Manager']));
 const [requirements,creditRows,coverRows,eventRows,tasks,engagement]=await Promise.all([
 admin.rpc('release_requirements',{p_release:r.id}),
 admin.from('track_contributors').select('id,user_id,contribution_role,approved,profiles!track_contributors_user_id_fkey(full_name,stage_name,nickname)').eq('track_id',r.source_track_id).eq('approved',true),
 admin.from('project_assets').select('id,file_name,mime_type').eq('project_id',r.source_project_id).eq('asset_kind','visual').eq('review_status','approved').in('visibility',['project','public']).in('mime_type',['image/png','image/jpeg','image/webp']),
 admin.from('release_review_events').select('id,action,revision,note,created_at').eq('release_id',r.id).order('created_at',{ascending:false}),
 admin.from('project_tasks').select('id,title,status').eq('release_id',r.id).order('title'),
 editor||reviewer?admin.rpc('release_engagement',{p_actor:user.id,p_release:r.id}):Promise.resolve({data:null,error:null})
 ]);
 if([requirements,creditRows,coverRows,eventRows,tasks,engagement].some(x=>x.error))return <AppShell><div className="content"><h1>{r.title}</h1><p role="alert">Release information could not be loaded. Retry before making a decision.</p></div></AppShell>;
 const editable=editor&&['draft','changes_requested','rejected','withdrawn'].includes(r.workflow_state);
 const artists=(creditRows.data||[]).filter((c:any)=>['artist','primary_artist','recording_artist','lead_artist','featured_artist','featured','feature'].includes(c.contribution_role.toLowerCase().replaceAll(' ','_')));
 const date=new Date(new Date(r.release_at).getTime()+3*3600000).toISOString().slice(0,16);
 const form=(action:string,label:string,children?:React.ReactNode)=><ReleaseWorkflowForm id={r.id} revision={r.revision} action={action} label={label}>{children}</ReleaseWorkflowForm>;
 return <AppShell><main className="content"><Link href="/releases">← Project releases</Link><div className="heading"><div><h1>{r.title}</h1><p>{r.artist_name} · {releaseState(r)} · Revision {r.revision}</p><p>{releaseTime(r.release_at)}</p></div><Link href={'/production#track-'+r.source_track_id}>Source production record →</Link></div>
 <section className="panel"><h2>Release requirements</h2><ul>{Object.entries(requirements.data.checks||{}).map(([key,ok])=><li key={key}>{ok?'Ready':'Resolve'} · {key.replaceAll('_',' ')}</li>)}</ul><p>Credits identify participation. Splits record sharing agreements. Rights and release permission require documented evidence; a complete form is not legal clearance.</p><p className="preserve-lines">{r.credits}</p><p>Release authority: {r.release_permission||'Not recorded'}</p></section>
 {editable&&<section className="panel"><h2>Release information</h2>{form('save','Save release draft',<>
 <label>Title<input name="title" defaultValue={r.title} required maxLength={120}/></label>
 <label>Recording artist<select name="artist_id" required defaultValue={r.artist_id}>{artists.filter((c:any)=>!['featured_artist','featured','feature'].includes(c.contribution_role.toLowerCase())).map((c:any)=><option key={c.id} value={c.user_id}>{creatorDisplayName(first(c.profiles))}</option>)}</select></label>
 <label>Featured artists<select name="featured_artist_ids" multiple defaultValue={r.featured_artist_ids||[]}>{artists.map((c:any)=><option key={c.id} value={c.user_id}>{creatorDisplayName(first(c.profiles))}</option>)}</select></label>
 <label>Type<select name="release_type" defaultValue={r.release_type}>{['single','ep','album'].map(t=><option key={t}>{t}</option>)}</select></label><label>Collection<input name="collection" defaultValue={r.collection} maxLength={120}/></label>
 <label>Genre<input name="genre" defaultValue={r.genre} required maxLength={60}/></label>
 <label>Approved artwork<select aria-label="Approved artwork" name="cover_id" required defaultValue={r.source_cover_id||''}><option value="">Choose approved project artwork</option>{coverRows.data?.map((c:any)=><option key={c.id} value={c.id}>{c.file_name}</option>)}</select></label>
 <label>Release time (EAT)<input type="datetime-local" name="release_at" defaultValue={date} required/></label>
 <label>Description<textarea name="description" defaultValue={r.description} maxLength={2000}/></label><label>Documented permission to release<textarea name="release_permission" defaultValue={r.release_permission} required minLength={10} maxLength={2000}/></label>
 <label>ISRC (optional)<input name="isrc" defaultValue={r.isrc} maxLength={12}/></label><label>UPC (optional)<input name="upc" defaultValue={r.upc} maxLength={13}/></label>
 <label className="terms-check"><input type="checkbox" name="artwork_authorised" defaultChecked={r.artwork_authorised} required/>I am authorised to use this approved artwork for release.</label><label className="terms-check"><input type="checkbox" name="explicit" defaultChecked={r.explicit}/>Explicit content</label>
 </>)}<Link href={'/production#track-'+r.source_track_id}>Upload and review artwork using the existing Production files →</Link></section>}
 {editor&&['draft','changes_requested'].includes(r.workflow_state)&&form('submit','Submit approved material for review')}
 {r.submitted_at&&<section className="panel"><h2>Submitted material</h2><audio controls preload="none" src={'/api/releases/'+r.id+'/media'}/>{r.cover_key&&<img className="release-review-cover" alt="Submitted artwork" src={'/api/releases/'+r.id+'/media?kind=cover'}/>}</section>}
 {reviewer&&<section className="panel"><h2>Music release review</h2>{r.workflow_state==='submitted'&&form('review','Start release review')}{['submitted','under_review'].includes(r.workflow_state)&&<>{form('changes_requested','Request release changes',<label>Review reason<textarea name="note" required maxLength={1000}/></label>)}{form('reject','Reject release',<label>Rejection reason<textarea name="note" required maxLength={1000}/></label>)}{form('approve','Approve current release revision',<label>Review note<textarea name="note" maxLength={1000}/></label>)}</>}{r.workflow_state==='approved'&&form('publish',new Date(r.release_at)>new Date()?'Schedule approved release':'Publish approved release')}</section>}
 {(editor||reviewer)&&r.workflow_state!=='withdrawn'&&form('withdraw','Withdraw / unpublish release',<label>Reason<textarea name="note" maxLength={1000}/></label>)}
 {r.status==='published'&&new Date(r.release_at)<=new Date()&&<Link href={'/billboard/'+r.id}>Open public release →</Link>}
 <section className="panel"><h2>Release actions</h2>{!tasks.data?.length&&editor&&form('campaign','Add release checklist')}{tasks.data?.map((t:any)=><p key={t.id}>{t.title} · {t.status} <Link href={'/tasks#task-'+t.id}>Open task →</Link></p>)}</section>
 <section className="panel"><h2>Available engagement</h2><p>Counts reflect available records, not verified listening or payable revenue.</p>{Object.entries(engagement.data||{}).map(([key,value])=><p key={key}>{key.replaceAll('_',' ')}: {String(value)}</p>)}<p>Listening analytics: unavailable. Media requests are not counted as plays.</p></section>
 <details className="panel"><summary>Review history</summary>{eventRows.data?.map((e:any)=><p key={e.id}>Revision {e.revision} · {e.action} · {releaseTime(e.created_at)} {e.note}</p>)}</details>
 </main></AppShell>;
}
