import Link from 'next/link';
import PublicNavigation from '../../components/PublicNavigation';
import PublicFooter from '../../components/PublicFooter';
import TrackPlaylist from '../../components/MusicQueue';
import {VoteButton,ShareRelease,LikeButton} from '../../components/ReleaseControls';
import {chart,viewer,currentChartWeek} from '../../lib/community';
import {createAdminClient} from '../../lib/supabase/admin';
import {fanHeroSettings,heroImage} from '../../lib/fanHero';
export const dynamic='force-dynamic';
export const metadata={title:'FACKTS Billboard',description:'Discover independent music, hear new releases and vote for your favourites on FACKTS Music.'};
export default async function Billboard({searchParams}:{searchParams:Promise<{collection?:string;artist?:string;q?:string}>}){
 const params=await searchParams;const[releases,user,heroes]=await Promise.all([chart(),viewer(),fanHeroSettings()]);
 const hero=heroes.billboard.enabled?heroes.billboard:undefined;
 const cover=releases.find(r=>r.has_cover);
 const background=heroImage(hero,cover?`/api/releases/${cover.id}/media?kind=cover`:"/branding/fackts-creator-red-wide.jpg");
 const{data:votes}=user?await createAdminClient().from('music_votes').select('release_id').eq('user_id',user.id).eq('week_start',currentChartWeek()):{data:[]};
 const voted=new Set((votes||[]).map(v=>v.release_id));
 const visible=releases.filter(r=>(!params.collection||r.collection===params.collection)&&(!params.artist||r.artist_id===params.artist)&&(!params.q||`${r.title} ${r.artist_name} ${r.collection}`.toLowerCase().includes(params.q.toLowerCase())));
 const queue=params.collection?[...visible].sort((a,b)=>a.track_number-b.track_number):visible;
 return <><PublicNavigation/><main className="community-page">
 <header className={"billboard-hero fm-billboard-photo-hero fm-hero-"+(hero?.layout||"editorial")}><img className="fm-billboard-hero-art" src={background} alt=""/><span className="eyebrow">{hero?.eyebrow||"THE SOUND. THE PEOPLE. THE CHART."}</span><h1>{hero?.title||"FACKTS Billboard"}</h1><p>{hero?.description||"Discover a new favourite. Be there for the first release. Help the music move."}</p><div className="community-actions"><Link href={hero?.ctaHref|| (user?"/fan":"/listen")}>{hero?.ctaLabel||(user?"My music":"Discover music")}</Link>{!user&&<Link href="/signup?next=/fan">Join as a fan</Link>}</div></header>
 <div className="community-chart-heading"><div><h2>{params.collection||'This week’s chart'}</h2><p>Week of {currentChartWeek()} · Resets Monday, 00:00 Kenya time.</p></div><form className="community-search"><input name="q" defaultValue={params.q} aria-label="Search music" placeholder="Song, artist or collection"/><button>Search</button></form></div>
 <p className="community-note">Ranked by 50% qualified plays, 25% new likes, 15% artist follower growth and 10% votes, normalized weekly. A qualified play requires meaningful listening; seeks and suspicious repeats do not count. Only published songs appear.</p>
 {(params.collection||params.q)&&<Link href="/billboard">← Full chart</Link>}
 {queue.length?<TrackPlaylist storageKey={`fackts-public-playlists:${user?.id||"guest"}`} enableRanking={false} tracks={queue.map(r=>({id:r.id,title:r.title,subtitle:`${r.artist_name}${r.collection?' · '+r.collection:''}`,src:`/api/releases/${r.id}/media`,artwork:r.has_cover?`/api/releases/${r.id}/media?kind=cover`:undefined,listened:false,eligible:false}))}/>:<section className="community-empty"><h2>{releases.length?'No songs match your search.':'The first releases start here.'}</h2><p>New music is on its way. Explore the artists and build your own listening space.</p><Link href="/creators">Meet the artists →</Link></section>}
 <section className="billboard-list" aria-label="Weekly chart">{visible.map(r=><article key={r.id}><span className="chart-position">{releases.findIndex(x=>x.id===r.id)+1}</span><div className="chart-song"><Link href={`/billboard/${r.id}`}><h3>{r.title} {r.explicit&&<small>EXPLICIT</small>}</h3></Link><p>{r.artist_name}</p>{r.collection&&<Link href={`/billboard?collection=${encodeURIComponent(r.collection)}&artist=${r.artist_id}`}>{r.collection}</Link>}{r.debut&&<small className="release-debut">First release on FACKTS</small>}</div><div className="chart-votes"><strong>{r.plays??0}</strong><span>qualified plays this week · {r.unique_listeners??0} listeners</span><span>{r.followers??0} artist followers · {r.votes} votes</span><span>Score {r.chart_score??0} / 100</span><LikeButton id={r.id} userId={user?.id} artistId={r.artist_id} count={r.likes??0}/>{user?<VoteButton id={r.id} voted={voted.has(r.id)} own={user.id===r.artist_id}/>:<Link href={`/login?next=${encodeURIComponent('/billboard/'+r.id)}`}>Sign in to vote</Link>}</div><ShareRelease id={r.id} title={r.title}/></article>)}</section>
 </main><PublicFooter/></>;
}
