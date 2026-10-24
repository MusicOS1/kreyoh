"use client";
import type {DiscoveryItem} from '../lib/discoveryContent';
import type {MusicArtist} from '../lib/musicArtistsTypes';
import {creditedToArtist} from '../lib/releaseArtistMatch';
import type {FanHeroConfig,FanHeroArea} from '../lib/fanHeroConfig';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import TrackWaveform from './TrackWaveform';
import {useListening} from './ListeningProvider';
import {readPreference,writePreference} from '../lib/listeningState';
import styles from './ListenerExperience.module.css';
import ArtistDiscovery from './ArtistDiscovery';
import ReleaseComments from './ReleaseComments';
import {VoteButton,ShareRelease} from './ReleaseControls';
import {moveQueueTrack} from '../lib/playerQueue';
import {updateFanLibrary} from '../app/fan/actions';
type Release={id:string;title:string;artist_id:string;artist_name:string;collection:string;has_cover:boolean;release_at:string;votes:number;genre?:string};
type Item={kind:string;item_id:string;label:string;track_ids:string[];updated_at:string};
export default function ListenerExperience({releases,userId,name,initialTab='For You',initialLibrary=[],votedIds=[],unread=0,editorial=[],loadWarning,heroSettings,artistsDirectory=[],showFanNav=true}:{releases:Release[];userId?:string;name?:string;initialTab?:string;initialLibrary?:Item[];votedIds?:string[];unread?:number;editorial?:DiscoveryItem[];loadWarning?:string;heroSettings?:Record<FanHeroArea,FanHeroConfig>;artistsDirectory?:MusicArtist[];showFanNav?:boolean}){
 const[tab,setTab]=useState(initialTab),[artistFocusId,setArtistFocusId]=useState<string|null>(null),[query,setQuery]=useState(''),[library,setLibrary]=useState(initialLibrary),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[playlistName,setPlaylistName]=useState(''),[playlistId,setPlaylistId]=useState('');
 const [visibleCount,setVisibleCount]=useState(20);
 useEffect(()=>setVisibleCount(20),[tab,query,playlistId]);
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
 const publicArtistById=useMemo(()=>new Map(artistsDirectory.map(artist=>[artist.id,artist])),[artistsDirectory]);
 const publicArtistIds=new Set(publicArtistById.keys());
 const isVerifiedArtistRelease=(release:Release)=>{const artist=publicArtistById.get(release.artist_id);return Boolean(artist&&creditedToArtist(release.artist_name,artist.name));};
 function openArtist(id:string){if(!publicArtistIds.has(id))return;setArtistFocusId(id);setTab('Artists');setQuery('');}
 const lists=library.filter(x=>x.kind==='playlist');
 const collections=Array.from(new Map(releases.filter(r=>r.collection).map(r=>[`${r.artist_id}:${r.collection}`,{name:r.collection,artist:r.artist_name,songs:releases.filter(x=>x.artist_id===r.artist_id&&x.collection===r.collection)}])).values());
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
 },[tab,releases,rows,editorial,hero,artistsDirectory]);

 async function change(kind:string,id:string,enabled:boolean,label='',ids:string[]=[]){if(!userId)return;setBusy(true);try{const result=await updateFanLibrary(kind,id,enabled,label,ids);if(result.ok){setLibrary(old=>[...old.filter(x=>!(x.kind===kind&&x.item_id===id)),...(enabled?[{kind,item_id:id,label,track_ids:ids,updated_at:new Date().toISOString()}]:[])]);setNotice(enabled?'Saved to your account.':'Removed from your library.');}else setNotice(result.error||'Please try again.');}catch{setNotice('Your change could not be saved. Reconnect and try again.');}finally{setBusy(false);}}
 function play(r:Release){playSong(r.id);}
 async function remember(id:string){if(!userId||remembered.current.has(id))return;remembered.current.add(id);try{const result=await updateFanLibrary('recent',id,true);if(result.ok)setLibrary(old=>[{kind:'recent',item_id:id,label:'',track_ids:[],updated_at:new Date().toISOString()},...old.filter(x=>x.kind!=='recent'||x.item_id!==id)]);else remembered.current.delete(id);}catch{remembered.current.delete(id);}}
 const tabs=userId?['For You','Artists','Albums & EPs','Shows','Billboard','My Library','Following','Recently played']:['For You','Artists','Albums & EPs','Shows','Billboard'];
 const selectTab=(value:string)=>{setTab(value);setQuery('');setArtistFocusId(null);};
 const recent=library.filter(item=>item.kind==='recent').map(item=>releases.find(release=>release.id===item.item_id)).filter((item):item is Release=>Boolean(item)).slice(0,5);
 return <main className={styles.experience}>
  <aside className={styles.sidebar} aria-label="Music library sections"><div><small>YOUR FREQUENCY</small><strong>Find your next sound.</strong></div><nav>{tabs.map((value,index)=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}><span aria-hidden="true">{['◈','◎','▦','◷','↗','♡','◇','↶'][index]}</span>{value}</button>)}</nav><div className={styles.sidebarNote}><span>MADE IN AFRICA.</span><p>Independent voices.<br/>One connected creative community.</p><Link href="/about">Inside FACKTS ↗</Link></div></aside>
  <div className={styles.main}>
   <div className={styles.toolbar}><div className={styles.breadcrumb}>FACKTS MUSIC <span>/</span> {tab==='For You'?'DISCOVER':tab.toUpperCase()}</div><label className={styles.search}><span aria-hidden="true">⌕</span><input aria-label="Search music" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search songs, artists, albums…"/></label></div>
   <nav className={styles.mobileTabs} aria-label="Music sections">{tabs.map(value=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>selectTab(value)}>{value}</button>)}</nav>
   <section className={styles.hero}>
    <img src={featured} alt="" className={styles.heroImage}/><div className={styles.heroShade}/>
    <div className={styles.heroCopy}><span>{hero?.eyebrow||'INDEPENDENT SOUNDS. SHARED POSSIBILITIES.'}</span><h1>{hero?.title||(tab==='For You'?'Find your frequency.':tab)}</h1><p>{hero?.description||(userId?'Discover the artists, collect the sounds and stay close to the music you love.':'Music with a story. People with a vision. Discover the sounds coming out of the FACKTS community.')}</p><div>{hero?.ctaHref&&hero.ctaLabel?<Link href={hero.ctaHref}>{hero.ctaLabel} ↗</Link>:rows.length>0?<button type="button" onClick={()=>play(rows[0])}>▶ Start listening</button>:<button type="button" onClick={()=>selectTab('Artists')}>Meet the artists ↗</button>}<button type="button" onClick={()=>selectTab(tab==='Artists'?'For You':'Artists')}>{tab==='Artists'?'Explore the music':'Explore artists'} →</button></div></div>
   </section>
   {loadWarning&&<p role="alert" className={styles.notice}>{loadWarning}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
   {tab==='For You'&&recent.length>0&&<section className={styles.section}><header><div><span>BACK IN YOUR ROTATION</span><h2>Continue listening.</h2></div><button type="button" onClick={()=>selectTab('Recently played')}>Recently played ↗</button></header><div className={styles.recent}>{recent.map(release=><button type="button" key={release.id} onClick={()=>play(release)}>{release.has_cover?<img src={`/api/releases/${release.id}/media?kind=cover`} alt=""/>:<span aria-hidden="true">♫</span>}<span><strong>{release.title}</strong><small>{release.artist_name}</small></span><b aria-hidden="true">▶</b></button>)}</div></section>}
   {tab==='Artists'&&<ArtistDiscovery key={artistFocusId||'directory'} initialArtistId={artistFocusId} artists={artistsDirectory} releases={releases} viewerId={userId} following={id=>has('following',id)} onFollow={id=>void change('following',id,!has('following',id))} onPlay={play}/>}
   {tab==='My Library'&&<section className={styles.playlists}><div><button type="button" aria-pressed={!playlistId} onClick={()=>setPlaylistId('')}>♥ Favourites</button>{lists.map(item=><button type="button" aria-pressed={playlistId===item.item_id} key={item.item_id} onClick={()=>setPlaylistId(item.item_id)}>{item.label}</button>)}</div><form onSubmit={async event=>{event.preventDefault();await change('playlist',crypto.randomUUID(),true,playlistName,[]);setPlaylistName('');}}><input aria-label="New playlist name" required maxLength={60} value={playlistName} onChange={event=>setPlaylistName(event.target.value)} placeholder="Name a new playlist"/><button disabled={busy}>Create playlist</button></form>{activeList&&<button type="button" disabled={busy} onClick={async()=>{await change('playlist',activeList.item_id,false);setPlaylistId('');}}>Delete {activeList.label}</button>}</section>}
   {tab==='For You'&&editorial.some(item=>item.kind==='feature')&&<section className={styles.editorial}>{editorial.filter(item=>item.kind==='feature').map(item=><article key={item.id}>{item.image&&<img src={item.image} alt=""/>}<div><span>ON FACKTS</span><h2>{item.title}</h2><p>{item.description}</p>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer">Explore ↗</a>}</div></article>)}</section>}
   {tab!=='Artists'&&<section className={styles.section}><header><div><span>{tab==='Billboard'?'THIS WEEK’S COMMUNITY VOTES':'THE SOUND OF THE COMMUNITY'}</span><h2>{tab==='For You'?'Fresh releases.':tab==='Following'?'New from your artists.':tab==='Billboard'?'The Billboard.':activeList?.label||tab}</h2></div><span>{rows.length} {rows.length===1?'song':'songs'}</span></header>
    {!rows.length&&<div className={styles.empty}><span aria-hidden="true">♫</span><h3>{releases.length?'Make this space yours.':'The first releases are on their way.'}</h3><p>{tab==='My Library'?'Save a favourite or start a playlist. Your collection lives here.':tab==='Following'?'Follow artists to keep their new releases close.':'Meet the people behind the music while the catalogue grows.'}</p><button type="button" onClick={()=>selectTab('Artists')}>Explore artists ↗</button></div>}
    <div className={styles.songGrid}>{rows.slice(0,visibleCount).map(release=><article className={styles.song} key={release.id}><button type="button" className={styles.cover} aria-label={`${progress.id===release.id&&progress.isPlaying?'Pause':'Play'} ${release.title}`} onClick={()=>play(release)}>{release.has_cover?<img src={`/api/releases/${release.id}/media?kind=cover`} alt={`${release.title} artwork`} loading="lazy"/>:<span aria-hidden="true">♫</span>}<b>{progress.id===release.id&&progress.isPlaying?'Ⅱ':'▶'}</b></button><div className={styles.songCopy}><Link href={`/billboard/${release.id}`}><h3>{release.title}</h3></Link>{isVerifiedArtistRelease(release)?<button type="button" onClick={()=>openArtist(release.artist_id)}>{release.artist_name} ↗</button>:<p>{release.artist_name}</p>}{release.collection&&<small>{release.collection}</small>}</div><div className={styles.songActions}><button type="button" onClick={()=>play(release)}>{progress.id===release.id&&progress.isPlaying?'Ⅱ Pause':'▶ Listen'}</button>{userId?<button type="button" disabled={busy} aria-label={`${has('saved',release.id)?'Unsave':'Save'} ${release.title}`} aria-pressed={has('saved',release.id)} onClick={()=>void change('saved',release.id,!has('saved',release.id))}>{has('saved',release.id)?'♥':'♡'}</button>:<Link href="/login?next=/fan">♡ Save</Link>}</div><details className={styles.songDetails}><summary>Song, community & playlist options</summary><TrackWaveform id={release.id} active={progress.id===release.id} position={progress.position} duration={progress.duration} onStart={()=>play(release)} onSeek={time=>seek(release.id,time)}/><div className={styles.detailActions}><ShareRelease id={release.id} title={release.title}/>{userId&&isVerifiedArtistRelease(release)&&<button disabled={busy} onClick={()=>void change('following',release.artist_id,!has('following',release.artist_id))}>{has('following',release.artist_id)?'Following':'+ Follow artist'}</button>}{userId&&lists.length>0&&<select aria-label={`Add ${release.title} to playlist`} value="" disabled={busy} onChange={event=>{const list=lists.find(item=>item.item_id===event.target.value);if(list)void change('playlist',list.item_id,true,list.label,[...new Set([...list.track_ids,release.id])]);}}><option value="">Add to playlist</option>{lists.map(list=><option key={list.item_id} value={list.item_id}>{list.label}</option>)}</select>}{activeList&&<><button type="button" disabled={busy||activeList.track_ids.indexOf(release.id)===0} aria-label={`Move ${release.title} up`} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,moveQueueTrack(activeList.track_ids,activeList.track_ids.indexOf(release.id),activeList.track_ids.indexOf(release.id)-1))}>↑ Move up</button><button type="button" disabled={busy||activeList.track_ids.indexOf(release.id)===activeList.track_ids.length-1} aria-label={`Move ${release.title} down`} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,moveQueueTrack(activeList.track_ids,activeList.track_ids.indexOf(release.id),activeList.track_ids.indexOf(release.id)+1))}>↓ Move down</button><button type="button" disabled={busy} onClick={()=>void change('playlist',activeList.item_id,true,activeList.label,activeList.track_ids.filter(id=>id!==release.id))}>Remove from playlist</button></>}{tab==='Billboard'&&<><span>{release.votes} votes</span>{userId?<VoteButton id={release.id} voted={votedIds.includes(release.id)} own={userId===release.artist_id}/>:<Link href="/login?next=/fan">Sign in to vote</Link>}</>}</div><ReleaseComments releaseId={release.id} viewerId={userId}/></details></article>)}</div>
    {rows.length>visibleCount&&<button type="button" className={styles.loadMore} onClick={()=>setVisibleCount(count=>count+20)}>Show more songs ({rows.length-visibleCount} remaining)</button>}
   </section>}
   {(tab==='For You'||tab==='Albums & EPs')&&collections.length>0&&<section className={styles.section}><header><div><span>MORE THAN A SINGLE</span><h2>Albums & collections.</h2></div><button type="button" onClick={()=>selectTab('Albums & EPs')}>Explore collections ↗</button></header><div className={styles.collections}>{collections.map(collection=><button type="button" key={`${collection.artist}:${collection.name}`} onClick={()=>{if(collection.songs.length)play(collection.songs[0]);setQuery(collection.name);}}>{collection.songs[0].has_cover?<img src={`/api/releases/${collection.songs[0].id}/media?kind=cover`} alt=""/>:<span aria-hidden="true">▦</span>}<span><strong>{collection.name}</strong><small>{collection.artist} · {collection.songs.length} songs</small></span><b aria-hidden="true">↗</b></button>)}</div></section>}
   {(tab==='For You'||tab==='Shows')&&editorial.some(item=>item.kind==='show')&&<section className={styles.section}><header><div><span>BEYOND THE RECORD</span><h2>Shows & conversations.</h2></div></header><div className={styles.editorial}>{editorial.filter(item=>item.kind==='show').map(item=><article key={item.id}>{item.image&&<img src={item.image} alt="" loading="lazy"/>}<div><h3>{item.title}</h3><p>{item.description}</p>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer">Watch ↗</a>}</div></article>)}</div></section>}
   {tab!=='Artists'&&<section className={styles.section}><header><div><span>THE PEOPLE BEHIND THE SOUND</span><h2>Meet the artists.</h2></div><button type="button" onClick={()=>selectTab('Artists')}>All artists ↗</button></header><div className={styles.artists}>{artistHighlights.map(artist=><article key={artist.id}><button type="button" className={styles.artistPhoto} onClick={()=>openArtist(artist.id)} aria-label={`Explore ${artist.name}`}>{artist.avatar||artist.hero?<img src={artist.avatar||artist.hero||''} alt="" loading="lazy"/>:<span>{artist.name.slice(0,2).toUpperCase()}</span>}</button><button type="button" onClick={()=>openArtist(artist.id)}>{artist.name}</button><p>{artist.genres.slice(0,2).join(' · ')||artist.location||'FACKTS artist'}</p>{userId&&<button type="button" className={styles.follow} disabled={busy} aria-pressed={has('following',artist.id)} onClick={()=>void change('following',artist.id,!has('following',artist.id))}>{has('following',artist.id)?'Following':'+ Follow'}</button>}</article>)}</div>{!artistHighlights.length&&<div className={styles.empty}><h3>Artists are building their profiles.</h3><p>Public, discoverable artist profiles will appear here.</p><button type="button" onClick={()=>selectTab('Artists')}>Explore the artist directory ↗</button></div>}</section>}
   <div className={styles.closing}><span>ONE FACKTS MUSIC.</span><p>Discover the sound. Meet the people. Be part of the work.</p><Link href="/about">Our story ↗</Link></div>
  </div>
 </main>;
}
