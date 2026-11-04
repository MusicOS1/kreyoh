import Link from 'next/link';
import AppShell from '../../../components/AppShell';
import ReleaseSubmitForm, {ResumeReleaseDraft} from '../../../components/ReleaseSubmitForm';
import {ReleaseManagement} from '../../../components/ReleaseControls';
import {getWorkspace} from '../../../lib/workspace';
import './release-credits.css';
export default async function Submit(){
 const{user,admin,profile}=await getWorkspace();const{data:releases,error}=await admin.from('music_releases').select('id,title,artist_name,collection,status,release_at,review_note,created_at,audio_type,cover_key').eq('artist_id',user.id).order('created_at',{ascending:false});
 if(error)throw new Error('Could not load your submissions.');
 const {data:directory}=await admin.from('profiles')
  .select('id,stage_name,nickname,full_name,creator_types')
  .eq('profile_visibility','public').eq('account_status','active')
  .order('stage_name',{ascending:true,nullsFirst:false}).limit(500);
 const people=(directory||[]).map(person=>({
  id:person.id,
  name:String(person.stage_name||person.nickname||person.full_name||'').trim(),
  roles:Array.isArray(person.creator_types)?person.creator_types.filter((role:unknown):role is string=>typeof role==='string'):[],
 })).filter(person=>person.name && (person.roles.length>0));
 return <AppShell><main className="community-page member-community"><Link href="/billboard">← Public Billboard</Link><h1>Release your music</h1><p><Link href="/releases">Prepare a release from approved project music →</Link></p><p><Link href="/settings">Update your artist name, photo and public profile</Link> to help listeners find you. Once a release is approved, it appears automatically on your FACKTS artist profile.</p><p>A home for your finished singles, EPs and albums. Add each song separately and use the same collection name to group an EP or album. Private project audio and stems are never published automatically.</p>
 {user.email_confirmed_at&&profile?.account_status==='active'?<ReleaseSubmitForm people={people}/>:<p role="alert">Confirm your email and use an active account before submitting.</p>}
 <h2>Your submissions</h2>{!releases?.length&&<p>Your first release starts above.</p>}{releases?.map(r=><article className="community-card" key={r.id}><h3>{r.title}</h3><p>{r.artist_name} · {r.collection||'Single'} · <strong>{r.status==='published'&&new Date(r.release_at)>new Date()?'Approved · scheduled':r.status}</strong></p>{r.review_note&&<p>Review: {r.review_note}</p>}{r.status==='draft'&&<ResumeReleaseDraft id={r.id} title={r.title} audioType={r.audio_type} needsCover={Boolean(r.cover_key)}/>}{r.status==='rejected'&&<p>Address the feedback and submit a new release above.</p>}{r.status==='published'&&new Date(r.release_at)<=new Date()&&<Link href={`/billboard/${r.id}`}>Open release & share →</Link>}{r.status!=='withdrawn'&&r.status!=='draft'&&<ReleaseManagement id={r.id} status={r.status} owner/>}</article>)}
 </main></AppShell>;
}
