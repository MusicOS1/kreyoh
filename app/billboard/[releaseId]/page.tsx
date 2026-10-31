import Link from 'next/link';
import {notFound} from 'next/navigation';
import PublicNavigation from '../../../components/PublicNavigation';
import PublicFooter from '../../../components/PublicFooter';
import ReleaseAudienceActions from '../../../components/ReleaseAudienceActions';
import {VoteButton,ShareRelease,ReleaseVoteCount,LikeButton} from '../../../components/ReleaseControls';
import ReleaseComments from '../../../components/ReleaseComments';
import {viewer,currentChartWeek,uuidPattern} from '../../../lib/community';
import {createAdminClient} from '../../../lib/supabase/admin';
async function getRelease(id:string){if(!uuidPattern.test(id))notFound();const{data,error}=await createAdminClient().from('music_weekly_chart').select('*').eq('id',id).maybeSingle();if(error)throw new Error('Release unavailable.');if(!data)notFound();return data;}
export async function generateMetadata({params}:{params:Promise<{releaseId:string}>}){const r=await getRelease((await params).releaseId);return{title:`${r.title} — ${r.artist_name}`,description:`Listen to ${r.title} by ${r.artist_name} on FACKTS Music and vote this week.`,openGraph:{images:r.has_cover?[`/api/releases/${r.id}/media?kind=cover`]:[],title:`${r.title} — ${r.artist_name}`,description:r.description?.slice(0,160)||'Listen and vote on FACKTS Music.'}};}
export default async function Release({params}:{params:Promise<{releaseId:string}>}){
 const r=await getRelease((await params).releaseId),user=await viewer();const admin=createAdminClient();
 const{data:vote}=user?await admin.from('music_votes').select('release_id').eq('release_id',r.id).eq('user_id',user.id).eq('week_start',currentChartWeek()).maybeSingle():{data:null};
 const {data:featured=[]}=r.featured_artist_ids?.length?await admin.from('profiles').select('id,stage_name,full_name').in('id',r.featured_artist_ids).eq('profile_visibility','public').eq('account_status','active'):{data:[]};
 const {data:library=[]}=user?await admin.from('fan_music_library').select('kind,item_id,label,track_ids').eq('user_id',user.id):{data:[]};
 return <><PublicNavigation/><main className="community-page"><Link href="/billboard">← FACKTS Billboard</Link><header className="billboard-hero fm-billboard-photo-hero"><img className="fm-billboard-hero-art" src={r.has_cover?`/api/releases/${r.id}/media?kind=cover`:"/branding/fackts-creator-sky.jpg"} alt=""/><span className="eyebrow">{r.debut?'FIRST RELEASE ON FACKTS':'FACKTS MUSIC RELEASE'}</span><h1>{r.title}</h1><p>{r.artist_name}{r.explicit?' · Explicit':''}</p>{r.collection&&<Link href={`/billboard?collection=${encodeURIComponent(r.collection)}&artist=${r.artist_id}`}>{r.collection} · Track {r.track_number}</Link>}</header>
 <ReleaseAudienceActions releaseId={r.id} artistId={r.artist_id} userId={user?.id} saved={Boolean(library?.some((x:any)=>x.kind==='saved'&&x.item_id===r.id))} following={Boolean(library?.some((x:any)=>x.kind==='following'&&x.item_id===r.artist_id))} playlists={(library||[]).filter((x:any)=>x.kind==='playlist')}/>
 <Link href={'/creators/'+r.artist_id}>Artist profile →</Link>{featured?.map((person:any)=><Link key={person.id} href={'/creators/'+person.id}>Featuring {person.stage_name||person.full_name}</Link>)}

 <section className="community-card"><h2>{r.plays??0} qualified plays · {r.unique_listeners??0} unique listeners</h2><p>{r.likes??0} song likes · {r.followers??0} artist followers · {r.follower_growth??0} net new follows this week · Billboard score {r.chart_score??0}</p><LikeButton id={r.id} userId={user?.id} artistId={r.artist_id} count={r.likes??0}/></section>
 <section className="community-card"><h2><ReleaseVoteCount id={r.id} count={r.votes}/> this week</h2><p>One vote per verified account per song, each week. Resets Monday at 00:00 Kenya time.</p><div className="community-actions">{user?<VoteButton id={r.id} voted={Boolean(vote)} own={r.artist_id===user.id}/>:<Link href={`/login?next=/billboard/${r.id}`}>Sign in to vote</Link>}<ShareRelease id={r.id} title={r.title}/><Link href={`/messages/${r.artist_id}`}>Message the artist</Link></div></section>
 <section className="community-card"><ReleaseComments releaseId={r.id} viewerId={user?.id} initialOpen/></section>
 <section className="community-card"><h2>About the release</h2><p className="preserve-lines">{r.description||'The artist has not added a description yet.'}</p><p>{r.genre} · Released {new Date(r.release_at).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi'})}</p><h3>Credits</h3><p className="preserve-lines">{r.credits||'Credits pending from the artist.'}</p></section>
 </main><PublicFooter/></>;
}
