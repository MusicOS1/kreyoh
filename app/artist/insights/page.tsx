import Link from 'next/link';
import {redirect} from 'next/navigation';
import {viewer,chart} from '../../../lib/community';
import {createAdminClient} from '../../../lib/supabase/admin';
import {releaseHasArtist} from '../../../lib/releaseArtistMatch';
import {publicPlayStats,reportRange} from '../../../lib/publicMusicReporting';
import EcosystemShell from '../../../components/ecosystem/EcosystemShell';
export const dynamic='force-dynamic';
const n=(num:number)=>num.toLocaleString('en-KE');
export default async function ArtistInsights({searchParams}:{searchParams:Promise<{from?:string;to?:string}>}){
 const user=await viewer();
 if(!user)redirect('/login?next=/artist/insights');
 const admin=createAdminClient(),range=reportRange(await searchParams);
 const {data:profile,error}=await admin.from('profiles').select('id,stage_name,nickname,full_name,creator_types').eq('id',user.id).maybeSingle();
 if(error||!profile)throw Error('Artist profile unavailable.');
 const [releases,metrics,follows]=await Promise.all([
  chart(),publicPlayStats(range.from,range.to),
  admin.from('fan_music_library').select('user_id',{count:'exact',head:true}).eq('kind','following').eq('item_id',user.id)
 ]);
 const names=[profile.stage_name,profile.nickname,profile.full_name].filter((x):x is string=>Boolean(x));
 const own=releases.filter(r=>names.some(name=>releaseHasArtist(r,user.id,name))||
  (r.explicit_artist_link===true&&(r.artist_id===user.id||r.featured_artist_ids?.includes(user.id))));
 const byId=new Map(metrics.map(m=>[m.release_id,m]));
 const totals=own.reduce((acc,r)=>{const m=byId.get(r.id);acc.plays+=m?.lifetime_plays||0;acc.period+=m?.period_plays||0;acc.likes+=r.likes||0;acc.comments+=r.comments||0;return acc;},{plays:0,period:0,likes:0,comments:0});
 return <EcosystemShell active="artist"><main className="community-page member-community">
 <Link href="/home">← Artist workspace</Link>
 <header><span className="eyebrow">MY PUBLIC MUSIC</span><h1>My audience</h1><p>{profile.stage_name||profile.nickname||profile.full_name||'Artist'} · streams on released music only.</p></header>
 <form method="GET" className="community-actions"><label>From <input type="date" name="from" defaultValue={range.from}/></label><label>To <input type="date" name="to" defaultValue={range.to}/></label><button type="submit">Update</button></form>
 <section className="control-metrics">{([['My published songs',own.length],['Lifetime plays',totals.plays],['Plays this period',totals.period],['Song likes',totals.likes],['Comments',totals.comments],['Followers',follows.error?null:follows.count]] as const).map(([name,value])=><article key={name}><span>{name}</span><strong>{value===null||value===undefined?'—':n(value)}</strong><small>Real public data</small></article>)}</section>
 {!own.length&&<section className="community-card"><h2>No public releases linked to your artist identity yet</h2><p>Releases must credit your artist name or explicitly link your profile. Merely uploading music under an account does not make every song yours. Ask the music admin to correct artist attribution for any missing release.</p></section>}
 <section className="community-card"><h2>My songs</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Song</th><th>Credited artist</th><th>Lifetime plays</th><th>Period plays</th><th>Listeners (song, period)</th><th>Likes</th><th>Comments</th></tr></thead><tbody>{own.map(r=>{const m=byId.get(r.id);return <tr key={r.id}><td><Link href={'/billboard/'+r.id}>{r.title}</Link></td><td>{r.artist_name}</td><td>{n(m?.lifetime_plays||0)}</td><td>{n(m?.period_plays||0)}</td><td>{n(m?.period_listeners||0)}</td><td>{n(r.likes||0)}</td><td>{n(r.comments||0)}</td></tr>})}</tbody></table></div></section>
 <p className="community-note">Public play measurements began 1 November 2026. Private studio listens and production-version plays are not public streams. Period listener counts are distinct per song; they are not added together to create a platform-wide audience total.</p>
 </main></EcosystemShell>;
}
