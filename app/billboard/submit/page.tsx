import Link from 'next/link';
import AppShell from '../../../components/AppShell';
import ReleaseSubmitForm from '../../../components/ReleaseSubmitForm';
import {ReleaseManagement} from '../../../components/ReleaseControls';
import {getWorkspace} from '../../../lib/workspace';
export default async function Submit(){
 const{user,admin,profile}=await getWorkspace();const{data:releases,error}=await admin.from('music_releases').select('id,title,artist_name,collection,status,release_at,review_note,created_at').eq('artist_id',user.id).order('created_at',{ascending:false});
 if(error)throw new Error('Could not load your submissions.');
 return <AppShell><main className="community-page member-community"><Link href="/billboard">← Public Billboard</Link><h1>Release your music</h1><p><Link href="/releases">Prepare a release from approved project music →</Link></p><p><Link href="/settings">Update your artist name, photo and public profile</Link> to help listeners find you. Once a release is approved, it appears automatically on your FACKTS artist profile.</p><p>A home for your finished singles, EPs and albums. Add each song separately and use the same collection name to group an EP or album. Private project audio and stems are never published automatically.</p>
 {user.email_confirmed_at&&profile?.account_status==='active'?<ReleaseSubmitForm/>:<p role="alert">Confirm your email and use an active account before submitting.</p>}
 <h2>Your submissions</h2>{!releases?.length&&<p>Your first release starts above.</p>}{releases?.map(r=><article className="community-card" key={r.id}><h3>{r.title}</h3><p>{r.artist_name} · {r.collection||'Single'} · <strong>{r.status==='published'&&new Date(r.release_at)>new Date()?'Approved · scheduled':r.status}</strong></p>{r.review_note&&<p>Review: {r.review_note}</p>}{r.status==='draft'&&<p>Upload not completed. Withdraw this draft and submit again.</p>}{r.status==='rejected'&&<p>Address the feedback and submit a new release above.</p>}{r.status==='published'&&new Date(r.release_at)<=new Date()&&<Link href={`/billboard/${r.id}`}>Open release & share →</Link>}{r.status!=='withdrawn'&&<ReleaseManagement id={r.id} status={r.status} owner/>}</article>)}
 </main></AppShell>;
}
