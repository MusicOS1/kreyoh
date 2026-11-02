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
 const searchRef=useRef<HTMLInputElement>(null);
 const focusSearch=()=>{searchRef.current?.focus();searchRef.current?.scrollIntoView({block:"start",behavior:"smooth"});};
 const matchingArtists=artistsDirectory.filter(a=>[a.name,a.location,a.tagline,...a.genres].join(" ").toLowerCase().includes(query.trim().toLowerCase())).slice(0,12);
 const matchingTracks=releases.filter(r=>[r.title,r.artist_name,r.collection||"",r.genre||""].join(" ").toLowerCase().includes(query.trim().toLowerCase())).slice(0,40);
 const currentRelease=releases.find(r=>r.id===progress.id)||null;
 const activeArtist=currentRelease?artistsDirectory.find(a=>releaseHasArtist(currentRelease,a.id,a.name)):null;
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
