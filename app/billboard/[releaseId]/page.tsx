import Link from 'next/link';
import {notFound} from 'next/navigation';
import PublicNavigation from '../../../components/PublicNavigation';
import PublicFooter from '../../../components/PublicFooter';
import TrackPlaylist from '../../../components/TrackPlaylist';
import {VoteButton,ShareRelease} from '../../../components/ReleaseControls';
import ReleaseComments from '../../../components/ReleaseComments';
import {viewer,currentChartWeek,uuidPattern} from '../../../lib/community';
import {createAdminClient} from '../../../lib/supabase/admin';
async function getRelease(id:string){if(!uuidPattern.test(id))notFound();const{data,error}=await createAdminClient().from('music_weekly_chart').select('*').eq('id',id).maybeSingle();if(error)throw new Error('Release unavailable.');if(!data)notFound();return data;}
export async function generateMetadata({params}:{params:Promise<{releaseId:string}>}){const r=await getRelease((await params).releaseId);return{title:`${r.title} — ${r.artist_name}`,description:`Listen to ${r.title} by ${r.artist_name} on FACKTS Music and vote this week.`,openGraph:{title:`${r.title} — ${r.artist_name}`,description:r.description.slice(0,160)||'Listen and vote on FACKTS Music.'}};}
export default async function Release({params}:{params:Promise<{releaseId:string}>}){
 const r=await getRelease((await params).releaseId),user=await viewer();const admin=createAdminClient();
 const{data:vote}=user?await admin.from('music_votes').select('release_id').eq('release_id',r.id).eq('user_id',user.id).eq('week_start',currentChartWeek()).maybeSingle():{data:null};
 return <><PublicNavigation/><main className="community-page"><Link href="/billboard">← FACKTS Billboard</Link><header className="billboard-hero fm-billboard-photo-hero"><img className="fm-billboard-hero-art" src={r.has_cover?`/api/releases/${r.id}/media?kind=cover`:"/branding/fackts-creator-sky.jpg"} alt=""/><span className="eyebrow">{r.debut?'FIRST RELEASE ON FACKTS':'FACKTS MUSIC RELEASE'}</span><h1>{r.title}</h1><p>{r.artist_name}{r.explicit?' · Explicit':''}</p>{r.collection&&<Link href={`/billboard?collection=${encodeURIComponent(r.collection)}&artist=${r.artist_id}`}>{r.collection} · Track {r.track_number}</Link>}</header>
 <TrackPlaylist enableRanking={false} tracks={[{id:r.id,title:r.title,subtitle:r.artist_name,src:`/api/releases/${r.id}/media`,artwork:r.has_cover?`/api/releases/${r.id}/media?kind=cover`:undefined,listened:false,eligible:false}]}/>
 <section className="community-card"><h2>{r.votes} votes this week</h2><p>One vote per verified account per song, each week. Resets Monday at 00:00 Kenya time.</p><div className="community-actions">{user?<VoteButton id={r.id} voted={Boolean(vote)} own={r.artist_id===user.id}/>:<Link href={`/login?next=/billboard/${r.id}`}>Sign in to vote</Link>}<ShareRelease id={r.id} title={r.title}/><Link href={`/messages/${r.artist_id}`}>Message the artist</Link></div></section>
 <section className="community-card"><ReleaseComments releaseId={r.id} viewerId={user?.id} initialOpen/></section>
 <section className="community-card"><h2>About the release</h2><p className="preserve-lines">{r.description||'The artist has not added a description yet.'}</p><p>{r.genre} · Released {new Date(r.release_at).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi'})}</p><h3>Credits</h3><p className="preserve-lines">{r.credits||'Credits pending from the artist.'}</p></section>
 </main><PublicFooter/></>;
}
