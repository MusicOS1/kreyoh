"use client";
import type {DiscoveryItem} from '../lib/discoveryContent';
import type {MusicArtist} from '../lib/musicArtistsTypes';
import {creditedToArtist,releaseHasArtist} from '../lib/releaseArtistMatch';
import type {FanHeroConfig,FanHeroArea} from '../lib/fanHeroConfig';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useListening} from './ListeningProvider';
import {readPreference,writePreference} from '../lib/listeningState';
import './streaming/streaming.css';
import {SearchIcon,PlayIcon,ArrowUpRight} from './Icons';
import {StreamSidebar,StreamMobileNav} from './streaming/StreamNavigation';
import StreamArtistHero from './streaming/StreamArtistHero';
import StreamTrackRow from './streaming/StreamTrackRow';
import ArtistDiscovery from './ArtistDiscovery';
import {moveQueueTrack} from '../lib/playerQueue';
import {backgroundInteraction} from '../lib/backgroundInteraction';
type Release={explicit_artist_link?:boolean;featured_artist_ids?:string[];id:string;title:string;artist_id:string;artist_name:string;collection:string;has_cover:boolean;release_at:string;votes:number;genre?:string};
type Item={kind:string;item_id:string;label:string;track_ids:string[];updated_at:string};
export default function ListenerExperience({releases,userId,name,initialTab='For You',initialLibrary=[],votedIds=[],unread=0,editorial=[],loadWarning,heroSettings,artistsDirectory=[],showFanNav=true}:{releases:Release[];userId?:string;name?:string;initialTab?:string;initialLibrary?:Item[];votedIds?:string[];unread?:number;editorial?:DiscoveryItem[];loadWarning?:string;heroSettings?:Record<FanHeroArea,FanHeroConfig>;artistsDirectory?:MusicArtist[];showFanNav?:boolean}){
 const[tab,setTab]=useState(initialTab),[artistFocusId,setArtistFocusId]=useState<string|null>(null),[query,setQuery]=useState(''),[library,setLibrary]=useState(initialLibrary),[notice,setNotice]=useState(''),[pendingItems,setPendingItems]=useState<Set<string>>(()=>new Set()),[playlistName,setPlaylistName]=useState(''),[playlistId,setPlaylistId]=useState('');
 const [visibleCount,setVisibleCount]=useState(20);
 const [creatingPlaylist,setCreatingPlaylist]=useState(false),[itemNotices,setItemNotices]=useState<Record<string,string>>({});
 const playlistCreation=useRef(false);
 useEffect(()=>setVisibleCount(20),[tab,query,playlistId]);
 const libraryRequests=useRef(new Set<string>());
 const itemPending=(kind:string,id:string)=>pendingItems.has(`${kind}:${id}`);
 const followRequests=useRef(new Set<string>());
 const [pendingFollows,setPendingFollows]=useState<Set<string>>(()=>new Set());
 const followPending=(id:string)=>pendingFollows.has(id);
 const remembered=useRef(new Set<string>());
 const {progress,play:playSong,seek}=useListening();
 const contextKey=`fm-context:${userId||'public'}`;
 const contextReady=useRef(false);
 useEffect(()=>{const saved=readPreference<{tab?:string;query?:string;playlistId?:string}>(contextKey);if(!location.search&&saved){if(['For You','Artists','Albums & EPs','Shows','Billboard','My Library','Following','Recently played'].includes(saved.tab||''))setTab(saved.tab!);if(typeof saved.query==='string')setQuery(saved.query.slice(0,200));if(initialLibrary.some(x=>x.kind==='playlist'&&x.item_id===saved.playlistId))setPlaylistId(saved.playlistId!);}contextReady.current=true;},[contextKey]);
 useEffect(()=>{if(contextReady.current)writePreference(contextKey,{tab,query,playlistId});},[contextKey,tab,query,playlistId]);
 const previousTab=useRef(initialTab);
 useEffect(()=>{if(previousTab.current!==initialTab){setTab(initialTab);previousTab.current=initialTab;}},[initialTab]);
 useEffect(()=>{if(progress.id&&progress.isPlaying)void remember(progress.id);},[progress.id,progress.isPlaying]);
 const has=(kind:string,id:string)=>library.some(x=>x.kind===kind&&x.item_id===id);
 const artistHighlights=artistsDirectory.slice(0,8);
 // Show a real, published artist before any generic promotional artwork.
 const spotlightArtist=useMemo(()=>artistsDirectory.find(artist=>(artist.hero||artist.avatar)&&releases.some(release=>releaseHasArtist(release,artist.id,artist.name)))||artistsDirectory.find(artist=>artist.hero||artist.avatar)||null,[artistsDirectory,releases]);
 const publicArtistById=useMemo(()=>new Map(artistsDirectory.map(artist=>[artist.id,artist])),[artistsDirectory]);
 const publicArtistIds=new Set(publicArtistById.keys());
 const isVerifiedArtistRelease=(release:Release)=>{const artist=publicArtistById.get(release.artist_id);return Boolean(artist&&releaseHasArtist(release,artist.id,artist.name));};
 function openArtist(id:string){if(!publicArtistIds.has(id))return;setArtistFocusId(id);setTab('Artists');setQuery('');}
 const lists=library.filter(x=>x.kind==='playlist');
 const collections=useMemo(()=>Array.from(new Map(releases.filter(r=>r.collection).map(r=>[`${r.artist_id}:${r.collection}`,{id:`${r.artist_id}:${r.collection}`,name:r.collection,artist:r.artist_name,songs:releases.filter(x=>x.artist_id===r.artist_id&&x.collection===r.collection)}])).values()),[releases]);
 const activeList=lists.find(x=>x.item_id===playlistId);
 const rows=useMemo(()=>{
  let source=[...releases];
  if(tab==='My Library')source=playlistId?source.filter(r=>library.find(x=>x.item_id===playlistId&&x.kind==='playlist')?.track_ids.includes(r.id)):source.filter(r=>library.some(x=>x.kind==='saved'&&x.item_id===r.id));
  if(tab==='Following')source=source.filter(r=>library.some(x=>x.kind==='following'&&x.item_id===r.artist_id)&&isVerifiedArtistRelease(r));
  if(tab==='Recently played')source=source.filter(r=>library.some(x=>x.kind==='recent'&&x.item_id===r.id)).sort((a,b)=>(library.find(x=>x.kind==='recent'&&x.item_id===b.id)?.updated_at||'').localeCompare(library.find(x=>x.kind==='recent'&&x.item_id===a.id)?.updated_at||''));
  if(tab==='My Library'&&playlistId){const ids=library.find(x=>x.kind==='playlist'&&x.item_id===playlistId)?.track_ids||[];source.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));}
  if(tab==='Artists')source=[];
  if(tab==='For You'||tab==='Following')source.sort((a,b)=>b.release_at.localeCompare(a.release_at));
  return source.filter(r=>`${r.title} ${r.artist_name} ${r.collection||''}`.toLowerCase().includes(query.toLowerCase()));
 },[releases,tab,library,playlistId,query,publicArtistById]);
 const area=({"For You":"for-you","Artists":"artists","Albums & EPs":"albums","Shows":"shows","Billboard":"billboard","My Library":"library","Following":"following","Recently played":"recent"} as Record<string,FanHeroArea>)[tab]||"for-you";
 const configured=heroSettings?.[area];
 const hero=configured?.enabled?configured:undefined;
 const featured=useMemo(()=>{
  if(hero?.releaseId)return "/api/releases/"+hero.releaseId+"/media?kind=cover";
  if(hero?.image)return hero.image;
  if(tab==='For You'&&!hero&&spotlightArtist&&(spotlightArtist.hero||spotlightArtist.avatar))return spotlightArtist.hero||spotlightArtist.avatar||"/branding/fackts-creative-community.jpg";
  if(tab==='Artists'){
   const artistWithPhoto=artistsDirectory.find(item=>item.hero||item.avatar);
   if(artistWithPhoto)return artistWithPhoto.hero||artistWithPhoto.avatar||"/branding/fackts-creative-community.jpg";
  }
  const available=tab==='For You'?releases:rows.length?rows:releases;
  const cover=available.find(r=>r.has_cover);
  const editorialPhoto=(tab==='Shows'?editorial.find(item=>item.kind==='show'&&item.image):editorial.find(item=>item.kind==='feature'&&item.image))?.image;
  // Use actual release artwork and FACKTS photography, never a fabricated portrait.
  return cover?"/api/releases/"+cover.id+"/media?kind=cover":editorialPhoto||(
   tab==='Shows'?"/branding/fackts-creator-red-wide.jpg":
   tab==='Albums & EPs'?"/branding/fackts-monnokid-workspace.jpg":
   "/branding/fackts-creative-community.jpg");
 },[tab,releases,rows,editorial,hero,artistsDirectory,spotlightArtist]);

 async function followArtist(id:string,enabled:boolean){
  if(!userId||followRequests.current.has(id))return;
  const previous=library.find(item=>item.kind==='following'&&item.item_id===id);
  followRequests.current.add(id);setPendingFollows(new Set(followRequests.current));
  setLibrary(old=>[...old.filter(item=>!(item.kind==='following'&&item.item_id===id)),...(enabled?[{kind:'following',item_id:id,label:'',track_ids:[],updated_at:new Date().toISOString()}]:[])]);
  try{
   const response=await fetch('/api/fan/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({artistId:id,following:enabled}),signal:AbortSignal.timeout(15000)});
   const result=await response.json();
   if(!response.ok||!result.ok)throw new Error(result.error||'Could not save this follow. Please try again.');
  }catch(error){
   setLibrary(old=>[...old.filter(item=>!(item.kind==='following'&&item.item_id===id)),...(previous?[previous]:[])]);
   setNotice(error instanceof Error&&error.name==='Error'?error.message:'Your follow could not be saved. Reconnect and try again.');
  }finally{followRequests.current.delete(id);setPendingFollows(new Set(followRequests.current));}
 }
 async function change(kind:string,id:string,enabled:boolean,label='',ids:string[]=[]){
  if(kind==='following')return followArtist(id,enabled);
  const key=`${kind}:${id}`;
  if(!userId||libraryRequests.current.has(key))return;
  setItemNotices(old=>({...old,[key]:''}));
  const previous=library.find(item=>item.kind===kind&&item.item_id===id);
  libraryRequests.current.add(key);setPendingItems(new Set(libraryRequests.current));
  setLibrary(old=>[...old.filter(item=>!(item.kind===kind&&item.item_id===id)),...(enabled?[{kind,item_id:id,label,track_ids:ids,updated_at:new Date().toISOString()}]:[])]);
  try{
   const result=await backgroundInteraction<{ok:boolean;error?:string}>('library',{kind,id,enabled,label,trackIds:ids});
   if(!result.ok)throw new Error(result.error||'Could not save. Try again.');
   return true;
  }catch(error){
   setLibrary(old=>[...old.filter(item=>!(item.kind===kind&&item.item_id===id)),...(previous?[previous]:[])]);
   const message=error instanceof Error?error.message:'Your change could not be saved. Reconnect and try again.';
   setItemNotices(old=>({...old,[key]:message}));setNotice(message);return false;
  }finally{libraryRequests.current.delete(key);setPendingItems(new Set(libraryRequests.current));}
 }
 function play(r:Release){playSong(r.id);}
 async function remember(id:string){if(!userId||remembered.current.has(id))return;remembered.current.add(id);try{const result=await backgroundInteraction<{ok:boolean}>('library',{kind:'recent',id,enabled:true});if(result.ok)setLibrary(old=>[{kind:'recent',item_id:id,label:'',track_ids:[],updated_at:new Date().toISOString()},...old.filter(x=>x.kind!=='recent'||x.item_id!==id)]);else remembered.current.delete(id);}catch{remembered.current.delete(id);}}
 const tabs=userId?['For You','Artists','Albums & EPs','Shows','Billboard','My Library','Following','Recently played']:['For You','Artists','Albums & EPs','Shows','Billboard'];
 const selectTab=(value:string)=>{setTab(value);setQuery('');setArtistFocusId(null);};
 const recent=library.filter(item=>item.kind==='recent').map(item=>releases.find(release=>release.id===item.item_id)).filter((item):item is Release=>Boolean(item)).slice(0,5);
 const spotlightTracks=spotlightArtist?releases.filter(r=>releaseHasArtist(r,spotlightArtist.id,spotlightArtist.name)).slice(0,4):[];
 const firstSpotlightTrack=spotlightTracks[0];
 return <main className={styles.experience+" fm-mixtape-listener"}>
  <aside className={styles.sidebar+' mx-listener-sidebar'} aria-label="Music library sections">
   <div className="mx-sidebar-brand"><small>FACKTS MUSIC</small><strong>Discover the sound.</strong></div>
   <nav aria-label="Explore music">{tabs.filter(value=>['For You','Artists','Albums & EPs','Shows','Billboard'].includes(value)).map((value,index)=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}><span aria-hidden="true">{['◈','◎','▦','◷','↗'][index]}</span>{value==='For You'?'Discover':value}</button>)}</nav>
   {userId&&<><small className="mx-sidebar-label">YOUR MUSIC</small><nav aria-label="Your music">{tabs.filter(value=>['My Library','Following','Recently played'].includes(value)).map((value,index)=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}><span aria-hidden="true">{['♡','◇','↶'][index]}</span>{value==='My Library'?'Library':value}</button>)}</nav></>}
  </aside>
  <div className={styles.main+' mx-listener-main'}>
   <div className={styles.toolbar+' mx-listener-toolbar'}><div className={styles.breadcrumb}>FACKTS MUSIC <span>/</span> {tab==='For You'?'DISCOVER':tab.toUpperCase()}</div><div className="fm-mixtape-tools"><label className={styles.search+' mx-listener-search'}><span aria-hidden="true">⌕</span><input aria-label="Search music" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search songs, artists, albums…"/></label></div></div>
   <FacktsFanMobileNav active={tab} onSelect={selectTab}/>
   <nav className={styles.mobileTabs+' mx-listener-tabs'} aria-label="Music sections">{tabs.map(value=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}>{value}</button>)}</nav>
   {tab==='Albums & EPs'?<header className="mx-albums-page-heading"><h1>ALBUMS &amp; EPS</h1><p>The latest releases from FACKTS artists.</p></header>:tab==='For You'&&spotlightArtist?
    <MixtapeArtistStage
      className="mx-fan-stage"
      name={spotlightArtist.name}
      portrait={spotlightArtist.hero||spotlightArtist.avatar}
      description={spotlightArtist.tagline||spotlightArtist.bio}
      location={spotlightArtist.location}
      genres={spotlightArtist.genres}
      actions={<>
        {firstSpotlightTrack&&<button type="button" className="mx-primary-action" onClick={()=>play(firstSpotlightTrack)}>▶ Play music</button>}
        {userId?<button type="button" className="mx-outline-action" disabled={followPending(spotlightArtist.id)} aria-busy={followPending(spotlightArtist.id)} aria-pressed={has('following',spotlightArtist.id)} onClick={()=>void change('following',spotlightArtist.id,!has('following',spotlightArtist.id))}>{has('following',spotlightArtist.id)?'✓ Following':'+ Follow'}</button>:<Link className="mx-outline-action" href={"/login?next="+encodeURIComponent("/creators/"+spotlightArtist.slug)}>+ Follow</Link>}
        <Link className="mx-stage-profile-link" href={"/creators/"+encodeURIComponent(spotlightArtist.slug||spotlightArtist.id)}>Explore artist ↗</Link>
      </>}
    />:
    <section className={styles.hero+" fm-mixtape-hero mx-generic-hero"}>
      <img src={featured} alt="" className={styles.heroImage}/><div className={styles.heroShade}/>
      <div className={styles.heroCopy}><span>{hero?.eyebrow||'FACKTS MUSIC'}</span><h1>{hero?.title||(tab==='For You'?'Meet your next obsession.':tab)}</h1><p>{hero?.description||'Real artists. Real music. One connected creative community.'}</p><div>{hero?.ctaHref&&hero.ctaLabel?<Link href={hero.ctaHref}>{hero.ctaLabel} ↗</Link>:<button type="button" onClick={()=>selectTab('Artists')}>Discover artists ↗</button>}<button type="button" onClick={()=>selectTab('For You')}>Explore music →</button></div></div>
    </section>}
   {tab==='For You'&&spotlightArtist&&spotlightTracks.length>0&&<section className="mx-featured-world" aria-label={"Music from "+spotlightArtist.name}>
     <div className="mx-feature-heading"><div><span>FROM THE ARTIST</span><h2>Listen to {spotlightArtist.name}.</h2></div><button type="button" onClick={()=>openArtist(spotlightArtist.id)}>All music ↗</button></div>
     <div className="mx-feature-tracks">{spotlightTracks.map((song,index)=><div className="mx-feature-track" key={song.id}>
       <span className="mx-feature-index">{String(index+1).padStart(2,'0')}</span>
       <button type="button" className="mx-feature-art" onClick={()=>play(song)} aria-label={"Play "+song.title}>{song.has_cover?<img src={"/api/releases/"+song.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}</button>
       <div><strong>{song.title}</strong><small>{song.collection||'Single'}</small></div>
       <button type="button" className="mx-feature-play" onClick={()=>play(song)} aria-label={"Play "+song.title}>▶</button>
     </div>)}</div>
   </section>}
   {loadWarning&&<p role="alert" className={styles.notice}>{loadWarning}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
   {tab==='For You'&&recent.length>0&&<section className={styles.section+' mx-listener-section'}><header><div><span>YOUR MUSIC</span><h2>Continue listening.</h2></div><button type="button" onClick={()=>selectTab('Recently played')}>Recently played ↗</button></header><div className={styles.recent}>{recent.map(release=><button type="button" key={release.id} onClick={()=>play(release)}>{release.has_cover?<img src={`/api/releases/${release.id}/media?kind=cover`} alt=""/>:<span aria-hidden="true">♫</span>}<span><strong>{release.title}</strong><small>{release.artist_name}</small></span><b aria-hidden="true">▶</b></button>)}</div></section>}
   {tab==='Artists'&&<ArtistDiscovery key={artistFocusId||'directory'} initialArtistId={artistFocusId} artists={artistsDirectory} releases={releases} viewerId={userId} following={id=>has('following',id)} followPending={followPending} followNotice={notice} onFollow={id=>void change('following',id,!has('following',id))} onPlay={play}/>}
   {tab==='My Library'&&<section className={styles.playlists}><div><button type="button" aria-pressed={!playlistId} onClick={()=>setPlaylistId('')}>♥ Favourites</button>{lists.map(item=><button type="button" aria-pressed={playlistId===item.item_id} key={item.item_id} onClick={()=>setPlaylistId(item.item_id)}>{item.label}</button>)}</div><form onSubmit={async event=>{event.preventDefault();if(playlistCreation.current)return;playlistCreation.current=true;setCreatingPlaylist(true);const name=playlistName;try{if(await change('playlist',crypto.randomUUID(),true,name,[]))setPlaylistName(current=>current===name?'':current);}finally{playlistCreation.current=false;setCreatingPlaylist(false);}}}><input aria-label="New playlist name" required maxLength={60} value={playlistName} onChange={event=>setPlaylistName(event.target.value)} placeholder="Name a new playlist"/><button disabled={creatingPlaylist}>{creatingPlaylist?'Creating…':'Create playlist'}</button></form>{activeList&&<button type="button" disabled={itemPending('playlist',activeList.item_id)} onClick={async()=>{if(await change('playlist',activeList.item_id,false))setPlaylistId('');}}>Delete {activeList.label}</button>}</section>}
   {tab==='For You'&&editorial.some(item=>item.kind==='feature')&&<section className={styles.editorial}>{editorial.filter(item=>item.kind==='feature').map(item=><article key={item.id}>{item.image&&<img src={item.image} alt=""/>}<div><span>ON FACKTS</span><h2>{item.title}</h2><p>{item.description}</p>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer">Explore ↗</a>}</div></article>)}</section>}
   {tab!=='Artists'&&<section className={styles.section+' mx-listener-section'+(tab==='Albums & EPs'?' mx-album-results':'')}><header><div><span>{tab==='Billboard'?'FACKTS CHART':'ON FACKTS'}</span><h2>{tab==='For You'?'New music.':tab==='Following'?'From your artists.':tab==='Billboard'?'Billboard.':activeList?.label||tab}</h2></div><span>{rows.length} {rows.length===1?'song':'songs'}</span></header>
    {!rows.length&&<div className={styles.empty}><span aria-hidden="true">♫</span><h3>{releases.length?'Make this space yours.':'The first releases are on their way.'}</h3><p>{tab==='My Library'?'Save a favourite or start a playlist. Your collection lives here.':tab==='Following'?'Follow artists to keep their new releases close.':'Meet the people behind the music while the catalogue grows.'}</p><button type="button" onClick={()=>selectTab('Artists')}>Explore artists ↗</button></div>}
    <div className={styles.songGrid+' mx-song-grid'}>{rows.slice(0,visibleCount).map(release=><article className={styles.song+' mx-song mx-album-card'} key={release.id}><button type="button" className={styles.cover+' mx-cover'} aria-label={`${progress.id===release.id&&progress.isPlaying?'Pause':'Play'} ${release.title}`} onClick={()=>play(release)}>{release.has_cover?<img src={`/api/releases/${release.id}/media?kind=cover`} alt={`${release.title} artwork`} loading="lazy"/>:<span aria-hidden="true">♫</span>}<b>{progress.id===release.id&&progress.isPlaying?'Ⅱ':'▶'}</b></button><div className={styles.songCopy+' mx-song-copy'}><Link href={`/billboard/${release.id}`}><h3>{release.title}</h3></Link>{isVerifiedArtistRelease(release)?<button type="button" onClick={()=>openArtist(release.artist_id)}>{release.artist_name} ↗</button>:<p>{release.artist_name}</p>}{release.collection&&<small>{release.collection}</small>}</div><div className={styles.songActions+' mx-song-actions'}>{userId?<button type="button" disabled={itemPending('saved',release.id)} aria-busy={itemPending('saved',release.id)} aria-label={`${has('saved',release.id)?'Unsave':'Save'} ${release.title}`} aria-pressed={has('saved',release.id)} onClick={()=>void change('saved',release.id,!has('saved',release.id))}>{has('saved',release.id)?'♥ Liked':'♡ Like'}</button>:<Link href="/login?next=/fan">♡ Like</Link>}<ReleaseComments releaseId={release.id} viewerId={userId} compact/><ShareRelease id={release.id} title={release.title}/>{tab==='Billboard'&&<><ReleaseVoteCount id={release.id} count={release.votes}/>{userId?<VoteButton id={release.id} voted={votedIds.includes(release.id)} own={userId===release.artist_id}/>:<Link href="/login?next=/fan">Sign in to vote</Link>}</>}{itemNotices[`saved:${release.id}`]&&<small role="alert">{itemNotices[`saved:${release.id}`]}</small>}</div><details className={styles.songDetails}><summary>More · playlist, follow & waveform</summary><TrackWaveform id={release.id} active={progress.id===release.id} position={progress.position} duration={progress.duration} onStart={()=>play(release)} onSeek={time=>seek(release.id,time)}/><div className={styles.detailActions}>{userId&&isVerifiedArtistRelease(release)&&<button disabled={followPending(release.artist_id)} aria-busy={followPending(release.artist_id)} onClick={()=>void change('following',release.artist_id,!has('following',release.artist_id))}>{has('following',release.artist_id)?'Following':'+ Follow artist'}</button>}{userId&&lists.length>0&&<select aria-label={`Add ${release.title} to playlist`} value="" onChange={event=>{const list=lists.find(item=>item.item_id===event.target.value);if(list)void change('playlist',list.item_id,true,list.label,[...new Set([...list.track_ids,release.id])]);}}><option value="">Add to playlist</option>{lists.map(list=><option key={list.item_id} value={list.item_id}>{list.label}</option>)}</select>}{activeList&&<><button type="button" disabled={itemPending('playlist',activeList.item_id)||activeList.track_ids.indexOf(release.id)===0} aria-label={`Move ${release.title} up`} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,moveQueueTrack(activeList.track_ids,activeList.track_ids.indexOf(release.id),activeList.track_ids.indexOf(release.id)-1))}>↑ Move up</button><button type="button" disabled={itemPending('playlist',activeList.item_id)||activeList.track_ids.indexOf(release.id)===activeList.track_ids.length-1} aria-label={`Move ${release.title} down`} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,moveQueueTrack(activeList.track_ids,activeList.track_ids.indexOf(release.id),activeList.track_ids.indexOf(release.id)+1))}>↓ Move down</button><button type="button" disabled={itemPending('playlist',activeList.item_id)} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,activeList.track_ids.filter(id=>id!==release.id))}>Remove from playlist</button></>}</div></details></article>)}</div>
    {rows.length>visibleCount&&<button type="button" className={styles.loadMore} onClick={()=>setVisibleCount(count=>count+20)}>Show more songs ({rows.length-visibleCount} remaining)</button>}
   </section>}
   {(tab==='For You'||tab==='Albums & EPs')&&collections.length>0&&<section className={styles.section+' mx-listener-section'}><header><div><span>MORE THAN A SINGLE</span><h2>Albums & collections.</h2></div><button type="button" onClick={()=>selectTab('Albums & EPs')}>Explore collections ↗</button></header><div className={styles.collections}>{collections.map(collection=><button type="button" key={collection.id} onClick={()=>{if(collection.songs.length)play(collection.songs[0]);setQuery(collection.name);}}>{collection.songs[0].has_cover?<img src={`/api/releases/${collection.songs[0].id}/media?kind=cover`} alt=""/>:<span aria-hidden="true">▦</span>}<span><strong>{collection.name}</strong><small>{collection.artist} · {collection.songs.length} songs</small></span><b aria-hidden="true">↗</b></button>)}</div></section>}
   {(tab==='For You'||tab==='Shows')&&editorial.some(item=>item.kind==='show')&&<section className={styles.section+' mx-listener-section'}><header><div><span>BEYOND THE RECORD</span><h2>Shows & conversations.</h2></div></header><div className={styles.editorial}>{editorial.filter(item=>item.kind==='show').map(item=><article key={item.id}>{item.image&&<img src={item.image} alt="" loading="lazy"/>}<div><h3>{item.title}</h3><p>{item.description}</p>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer">Watch ↗</a>}</div></article>)}</div></section>}
   {tab!=='Artists'&&<section className={styles.section+' mx-listener-section'}><header><div><span>DISCOVER</span><h2>More artists.</h2></div><button type="button" onClick={()=>selectTab('Artists')}>All artists ↗</button></header>{notice&&<p role="status" className={styles.notice}>{notice}</p>}<div className={styles.artists+' mx-artist-tiles'}>{artistHighlights.map(artist=><article key={artist.id}><button type="button" className={styles.artistPhoto+' mx-artist-tile-photo'} onClick={()=>openArtist(artist.id)} aria-label={`Explore ${artist.name}`}>{artist.avatar||artist.hero?<img src={artist.avatar||artist.hero||''} alt="" loading="lazy"/>:<span>{artist.name.slice(0,2).toUpperCase()}</span>}</button><button type="button" onClick={()=>openArtist(artist.id)}>{artist.name}</button><p>{artist.genres.slice(0,2).join(' · ')||artist.location||'FACKTS artist'}</p>{userId&&<button type="button" className={styles.follow} disabled={followPending(artist.id)} aria-busy={followPending(artist.id)} aria-pressed={has('following',artist.id)} onClick={()=>void change('following',artist.id,!has('following',artist.id))}>{has('following',artist.id)?'Following':'+ Follow'}</button>}</article>)}</div>{!artistHighlights.length&&<div className={styles.empty}><h3>Artists are building their profiles.</h3><p>Public, discoverable artist profiles will appear here.</p><button type="button" onClick={()=>selectTab('Artists')}>Explore the artist directory ↗</button></div>}</section>}
   <div className={styles.closing}><span>ONE FACKTS MUSIC.</span><p>Discover the sound. Meet the people. Be part of the work.</p><Link href="/about">Our story ↗</Link></div>
  </div>
 </main>;
}
 const trackList=(tracks:Release[],isChart=false)=> <div className="fs-track-list">
  {tracks.slice(0,visibleCount).map((release,index)=><StreamTrackRow
    key={release.id} release={release} rank={isChart?index+1:undefined} userId={userId}
    active={progress.id===release.id} isPlaying={progress.isPlaying} liked={has("saved",release.id)}
    likePending={itemPending("saved",release.id)}
    onLike={()=>void change("saved",release.id,!has("saved",release.id))}
    onPlay={()=>play(release)}
    onArtist={isVerifiedArtistRelease(release)?()=>openArtist(release.artist_id):undefined}
    onSeek={time=>seek(release.id,time)} position={progress.position} duration={progress.duration}
    playlists={lists} playlistPending={id=>itemPending("playlist",id)}
    onAddPlaylist={id=>{const list=lists.find(l=>l.item_id===id);if(list)void change("playlist",id,true,list.label,[...new Set([...list.track_ids,release.id])]);}}
    onMove={tab==="My Library"&&activeList?direction=>{const index=activeList.track_ids.indexOf(release.id);const next=index+direction;if(index>=0&&next>=0&&next<activeList.track_ids.length)void change("playlist",activeList.item_id,true,activeList.label,moveQueueTrack(activeList.track_ids,index,next));}:undefined}
    onRemove={tab==="My Library"&&activeList?()=>void change("playlist",activeList.item_id,true,activeList.label,activeList.track_ids.filter(id=>id!==release.id)):undefined}
    isBillboard={isChart} voted={votedIds.includes(release.id)}
    notice={itemNotices["saved:"+release.id]}
  />)}
  {tracks.length>visibleCount&&<button className="fs-loadmore" type="button" onClick={()=>setVisibleCount(n=>n+20)}>Show more songs · {tracks.length-visibleCount} remaining</button>}
 </div>;
 const shelf=(title:string,items:Release[])=>items.length>0&&<section className="fs-section" aria-label={title}>
   <div className="fs-section-heading"><h2>{title}</h2><button type="button" onClick={()=>selectTab("Albums & EPs")}>See all <ArrowUpRight size={16}/></button></div>
   <div className="fs-album-shelf">{items.slice(0,5).map(r=><button type="button" key={r.id} onClick={()=>play(r)} className="fs-album-tile">
     <div className="fs-album-art">{r.has_cover?<img src={"/api/releases/"+r.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}<span className="fs-album-hover"><PlayIcon size={18}/></span></div>
     <strong>{r.title}</strong><span>{r.artist_name}</span>
   </button>)}</div>
 </section>;
 return <main className="fm-streaming-ui">
  <StreamSidebar active={tab} onSelect={selectTab} onSearch={focusSearch} userId={userId} lists={lists} playlistId={playlistId}
   onPlaylist={id=>{setPlaylistId(id);setTab("My Library");setQuery("");}}/>
  <div className="fs-content">
   <header className="fs-content-topbar">
    <nav aria-label="Browse music" className="fs-top-categories">
      {["For You","Artists","Billboard"].map(t=><button type="button" key={t} aria-current={tab===t?"page":undefined} onClick={()=>selectTab(t)}>{t==="For You"?"Discover":t}</button>)}
    </nav>
    <label className="fs-search"><SearchIcon size={19}/><input ref={searchRef} type="search" value={query}
      onChange={e=>setQuery(e.target.value)} placeholder="Search songs, artists and releases…" aria-label="Search FACKTS Music"/></label>
   </header>
   {loadWarning&&<p className="fs-notice" role="alert">{loadWarning}</p>}
   {notice&&<p className="fs-notice" role="status">{notice}</p>}
   {query.trim()?<div className="fs-main-view">
    <div className="fs-page-heading"><span>SEARCH RESULTS</span><h1>Results for “{query.trim()}”</h1><p>Artists and music already published on FACKTS.</p></div>
    {matchingArtists.length>0&&<section className="fs-section"><div className="fs-section-heading"><h2>Artists</h2></div>
     <div className="fs-artist-grid">{matchingArtists.map(a=><button type="button" className="fs-artist-tile" key={a.id} onClick={()=>openArtist(a.id)}>
       <div>{a.avatar||a.hero?<img src={a.avatar||a.hero||""} alt="" loading="lazy"/>:<span>{a.name.slice(0,1)}</span>}</div>
       <strong>{a.name}</strong><small>{a.genres.slice(0,2).join(" · ")||a.location||"Artist"}</small>
     </button>)}</div></section>}
    <section className="fs-section"><div className="fs-section-heading"><h2>Songs</h2><span>{matchingTracks.length} results</span></div>
      {matchingTracks.length?trackList(matchingTracks):<div className="fs-empty">No published songs match that search.</div>}
    </section>
   </div>:<>
    {tab==="For You"&&<div className="fs-main-view">
      <StreamArtistHero artist={spotlightArtist} track={firstSpotlightTrack} onPlay={id=>playSong(id)}
       onOpen={openArtist} onFollow={id=>void change("following",id,!has("following",id))}
       following={Boolean(spotlightArtist&&has("following",spotlightArtist.id))}
       followPending={Boolean(spotlightArtist&&followPending(spotlightArtist.id))}
       userId={userId} fallbackImage={featured}/>
      {recent.length>0&&<section className="fs-section">
       <div className="fs-section-heading"><h2>Pick up where you left off</h2><button type="button" onClick={()=>selectTab("Recently played")}>History <ArrowUpRight size={16}/></button></div>
       <div className="fs-recent">{recent.map(r=><button type="button" key={r.id} onClick={()=>play(r)}>
        {r.has_cover?<img src={"/api/releases/"+r.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}
        <span><strong>{r.title}</strong><small>{r.artist_name}</small></span><PlayIcon size={18}/></button>)}</div>
      </section>}
      {shelf("Made on FACKTS",[...releases].sort((a,b)=>b.release_at.localeCompare(a.release_at)))}
      <section className="fs-section"><div className="fs-section-heading"><h2>Discover artists</h2><button type="button" onClick={()=>selectTab("Artists")}>Explore all <ArrowUpRight size={16}/></button></div>
        <div className="fs-artist-grid">{artistHighlights.map(a=><button type="button" className="fs-artist-tile" key={a.id} onClick={()=>openArtist(a.id)}>
          <div>{a.avatar||a.hero?<img src={a.avatar||a.hero||""} alt="" loading="lazy"/>:<span>{a.name.slice(0,1)}</span>}</div>
          <strong>{a.name}</strong><small>{a.genres.slice(0,2).join(" · ")||a.location||"FACKTS artist"}</small>
        </button>)}</div>
        {!artistHighlights.length&&<p className="fs-empty">Public artist profiles will appear here when ready.</p>}
      </section>
      <section className="fs-section"><div className="fs-section-heading"><h2>Fresh releases</h2><button type="button" onClick={()=>selectTab("Albums & EPs")}>View releases <ArrowUpRight size={16}/></button></div>
       {releases.length?trackList([...releases].sort((a,b)=>b.release_at.localeCompare(a.release_at)).slice(0,12)):<p className="fs-empty">Approved releases will appear here once published.</p>}
      </section>
    </div>}
    {tab==="Artists"&&<div className="fs-main-view"><ArtistDiscovery key={artistFocusId||"directory"}
      initialArtistId={artistFocusId} artists={artistsDirectory} releases={releases} viewerId={userId}
      following={id=>has("following",id)} followPending={followPending} followNotice={notice}
      onFollow={id=>void change("following",id,!has("following",id))} onPlay={play}/></div>}
    {tab==="Albums & EPs"&&<div className="fs-main-view">
      <div className="fs-page-heading"><span>THE CATALOGUE</span><h1>Albums &amp; EPs</h1><p>Discover real collections and releases from FACKTS artists.</p></div>
      {collections.length>0&&<section className="fs-section"><div className="fs-section-heading"><h2>Collections</h2><span>{collections.length} collections</span></div>
       <div className="fs-album-shelf">{collections.map(c=><button type="button" className="fs-album-tile" key={c.id}
        onClick={()=>{setQuery(c.name);}}>
        <div className="fs-album-art">{c.songs[0]?.has_cover?<img src={"/api/releases/"+c.songs[0].id+"/media?kind=cover"} alt=""/>:<span>♫</span>}</div>
        <strong>{c.name}</strong><span>{c.artist} · {c.songs.length} tracks</span></button>)}</div>
      </section>}
      <section className="fs-section"><div className="fs-section-heading"><h2>All published music</h2><span>{releases.length} songs</span></div>
       {releases.length?trackList(releases):<p className="fs-empty">Published music will appear here.</p>}
      </section>
    </div>}
    {tab==="Billboard"&&<div className="fs-main-view"><div className="fs-page-heading">
      <span>THE FACKTS CHART</span><h1>Billboard</h1><p>Music making moves across the FACKTS community.</p></div>
      {rows.length?trackList(rows,true):<p className="fs-empty">The chart will appear once live releases are available.</p>}
    </div>}
    {tab==="Shows"&&<div className="fs-main-view"><div className="fs-page-heading">
     <span>BEHIND THE MUSIC</span><h1>Shows &amp; conversations</h1><p>Artist stories, studio moments and conversations.</p></div>
     <div className="fs-shows">{editorial.filter(x=>x.kind==="show").map(item=><article key={item.id}>
       {item.image&&<img src={item.image} alt="" loading="lazy"/>}
       <div><h2>{item.title}</h2><p>{item.description}</p>{item.url&&<a target="_blank" rel="noopener noreferrer" href={item.url}>Watch <ArrowUpRight size={16}/></a>}</div></article>)}</div>
     {!editorial.some(x=>x.kind==="show")&&<p className="fs-empty">New shows and artist conversations are on the way.</p>}
    </div>}
    {tab==="My Library"&&<div className="fs-main-view"><div className="fs-page-heading"><span>YOUR SPACE</span><h1>Your library</h1>
      <p>Your favourite music, playlists and artists. Available when signed in.</p></div>
     <section className="fs-library-controls">
      <div className="fs-library-pills"><button type="button" aria-pressed={!playlistId} onClick={()=>setPlaylistId("")}>♥ Liked songs</button>
       {lists.map(l=><button key={l.item_id} type="button" aria-pressed={playlistId===l.item_id} onClick={()=>setPlaylistId(l.item_id)}>{l.label}</button>)}
      </div>
      <form onSubmit={async e=>{e.preventDefault();if(playlistCreation.current)return;playlistCreation.current=true;setCreatingPlaylist(true);const title=playlistName;try{if(await change("playlist",crypto.randomUUID(),true,title,[]))setPlaylistName(prev=>prev===title?"":prev);}finally{playlistCreation.current=false;setCreatingPlaylist(false);}}}>
       <label className="fs-sr-only" htmlFor="fs-playlist-name">Playlist name</label>
       <input id="fs-playlist-name" value={playlistName} onChange={e=>setPlaylistName(e.target.value)} required maxLength={60} placeholder="New playlist name"/>
       <button type="submit" disabled={creatingPlaylist}>{creatingPlaylist?"Creating…":"+ Create playlist"}</button>
      </form>
      {activeList&&<button type="button" className="fs-delete-playlist" disabled={itemPending("playlist",activeList.item_id)}
       onClick={async()=>{if(await change("playlist",activeList.item_id,false))setPlaylistId("");}}>Delete playlist</button>}
     </section>
     {rows.length?trackList(rows):<div className="fs-empty">Your library is ready. Like a track or add one to a playlist to see it here.</div>}
    </div>}
    {(tab==="Following"||tab==="Recently played")&&<div className="fs-main-view"><div className="fs-page-heading">
      <span>YOUR MUSIC</span><h1>{tab==="Following"?"Following":"Recently played"}</h1><p>{tab==="Following"?"Latest music from artists you follow.":"Return to the music you listened to."}</p></div>
      {rows.length?trackList(rows):<div className="fs-empty">{tab==="Following"?"Follow artists and their released music will show here.":"Your listening history will show here after you play music."}
       <button type="button" onClick={()=>selectTab("Artists")}>Explore artists <ArrowUpRight size={16}/></button></div>}
    </div>}
   </>}
  </div>
  <aside className="fs-right-rail" aria-label="Now playing and artist discovery">
   {currentRelease?<><div className="fs-rail-heading"><span className="fs-live-dot"/> NOW PLAYING</div>
    <div className="fs-rail-art">{currentRelease.has_cover?<img src={"/api/releases/"+currentRelease.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}</div>
    <div className="fs-rail-song"><strong>{currentRelease.title}</strong>
     {activeArtist?<button type="button" onClick={()=>openArtist(activeArtist.id)}>{currentRelease.artist_name} ↗</button>:<span>{currentRelease.artist_name}</span>}
    </div>
    <Link href={"/billboard/"+currentRelease.id} className="fs-rail-link">Song details &amp; comments <ArrowUpRight size={16}/></Link>
   </>:<><div className="fs-rail-heading">YOUR NEXT DISCOVERY</div>
     <p className="fs-rail-intro">Meet the people behind the sound.</p>
     {artistHighlights.slice(0,4).map(a=><button type="button" className="fs-rail-artist" key={a.id} onClick={()=>openArtist(a.id)}>
      <span>{a.avatar||a.hero?<img src={a.avatar||a.hero||""} alt=""/>:a.name.slice(0,1)}</span>
      <span><strong>{a.name}</strong><small>{a.genres[0]||a.location||"Independent artist"}</small></span>
      <ArrowUpRight size={15}/>
     </button>)}</>}
   <div className="fs-rail-note">Discover artists. Find your sound. Stay close to the music.</div>
  </aside>
  <StreamMobileNav active={tab} onSelect={selectTab} onSearch={focusSearch} userId={userId}/>
 </main>;
}
