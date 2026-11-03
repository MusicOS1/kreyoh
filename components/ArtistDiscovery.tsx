"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import MixtapeArtistStage from "./MixtapeArtistStage";
import type {MusicArtist} from "../lib/musicArtistsTypes";
import {releaseHasArtist} from "../lib/releaseArtistMatch";

type Release={attributed_artist_profile_id?:string;explicit_artist_link?:boolean;featured_artist_ids?:string[];id:string;title:string;artist_id:string;artist_name:string;has_cover:boolean;collection:string;genre?:string;release_at:string;votes:number};
type ArtistEntry=MusicArtist&{catalogueOnly?:boolean};

function youtubeEmbed(url:string) {
 try {
  const parsed=new URL(url),host=parsed.hostname.toLowerCase().replace(/^www\./,"");
  const id=host==="youtu.be"?parsed.pathname.split("/")[1]:
   host==="youtube.com"||host==="m.youtube.com"?parsed.searchParams.get("v")||parsed.pathname.split("/").pop():null;
  return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?"https://www.youtube-nocookie.com/embed/"+id:null;
 }catch{return null;}
}
function sourceLabel(url:string) {
 try {
  const host=new URL(url).hostname.replace(/^www\./,"").toLowerCase();
  return host.includes("spotify.com")?"Spotify":host.includes("youtube.com")||host==="youtu.be"?"YouTube":host.includes("soundcloud.com")?"SoundCloud":"Listen";
 }catch{return "Listen";}
}
export default function ArtistDiscovery({
 artists,releases,viewerId,following,onFollow,onPlay,initialArtistId,followPending=()=>false,followNotice
}:{artists:MusicArtist[];releases:Release[];viewerId?:string;
 following:(id:string)=>boolean;onFollow:(id:string)=>void;onPlay:(release:Release)=>void;initialArtistId?:string|null;followPending?:(id:string)=>boolean;followNotice?:string}){
 const [selected,setSelected]=useState<string|null>(initialArtistId||null);
 const [search,setSearch]=useState("");
 const [genre,setGenre]=useState("All");
 // Label-held catalogue entries are separate from artist profiles. Never
 // convert a shared uploader's release into personal performer credit.
 const directory=useMemo<ArtistEntry[]>(()=>{
  const extras=new Map<string,ArtistEntry>();
  for(const release of releases){
   if(artists.some(artist=>releaseHasArtist(release,artist.id,artist.name)))continue;
   const key=release.artist_name.trim().toLocaleLowerCase("en");
   if(!key||extras.has(key))continue;
   extras.set(key,{
    id:"catalogue:"+key,name:release.artist_name,
    avatar:release.has_cover?"/api/releases/"+release.id+"/media?kind=cover":null,
    hero:null,bio:"Explore releases published under this act's name on FACKTS.",
    tagline:"Published music",location:"",genres:release.genre?[release.genre]:[],
    slug:"",roles:[],catalogueOnly:true
   });
  }
  return [...artists,...extras.values()];
 },[artists,releases]);
 const selectedArtist=directory.find(artist=>artist.id===selected);
 const genres=useMemo(()=>["All",...new Set(directory.flatMap(artist=>artist.genres).filter(Boolean))].slice(0,7),[directory]);
 const filtered=directory.filter(artist=>(genre==="All"||artist.genres.includes(genre))&&
  [artist.name,artist.bio,artist.tagline,artist.location,...artist.genres].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
 const artistTracks=(artist:ArtistEntry)=>artist.catalogueOnly?
  releases.filter(release=>"catalogue:"+release.artist_name.trim().toLocaleLowerCase("en")===artist.id):
  releases.filter(release=>releaseHasArtist(release,artist.id,artist.name));
 const artistReleases=selectedArtist?artistTracks(selectedArtist):[];
 const artistName=(artist:MusicArtist)=>artist.name.trim()[0]?.toUpperCase()||"F";
 const artistPhoto=(artist:MusicArtist)=>artist.avatar||artist.hero;
 const picks=selectedArtist?.topSongs||[];
 const photos=selectedArtist?.photos||[];
 const highlights=selectedArtist?.achievements||[];
 const interview=selectedArtist?.interview||null;
 const embed=interview?youtubeEmbed(interview.url):null;
 const fullHref=selectedArtist&&!selectedArtist.catalogueOnly?"/creators/"+encodeURIComponent(selectedArtist.slug||selectedArtist.id):"";
 return <section className="fm-artist-room" aria-label="FACKTS artist discovery">
  {!selectedArtist&&<div className="fm-artist-intro">
   <span className="eyebrow">PEOPLE BEHIND THE MUSIC</span>
   <h2>Meet the artists.</h2>
   <p>Find their sound, discover their story and follow what's next.</p>
  </div>}
  {followNotice&&<p role="status">{followNotice}</p>}
  {selectedArtist?<div className="fm-artist-detail fm-fan-artist-detail" key={selectedArtist.id}>
   <button type="button" className="fm-artist-back" onClick={()=>setSelected(null)}>← All artists</button>
   <MixtapeArtistStage className="mx-discovery-stage" name={selectedArtist.name}
    portrait={selectedArtist.hero||selectedArtist.avatar} description={selectedArtist.tagline||selectedArtist.bio}
    genres={selectedArtist.genres} location={selectedArtist.location}
    actions={<>
     {artistReleases.length>0&&<button type="button" className="mx-primary-action" onClick={()=>onPlay(artistReleases[0])}>▶ Play music</button>}
     {selectedArtist.catalogueOnly?<span className="mx-stage-notice">Official artist profile not yet linked</span>:
      viewerId?<button type="button" className="mx-outline-action" disabled={followPending(selectedArtist.id)}
       aria-busy={followPending(selectedArtist.id)} aria-pressed={following(selectedArtist.id)}
       onClick={()=>onFollow(selectedArtist.id)}>{following(selectedArtist.id)?"✓ Following":"+ Follow artist"}</button>:
      <Link className="mx-outline-action" href={"/login?next="+encodeURIComponent("/fan?tab=Artists")}>Sign in to follow</Link>}
     {fullHref&&<Link className="mx-stage-profile-link" href={fullHref}>Open full profile ↗</Link>}
    </>}
   />
   <div className="fm-fan-artist-stats" aria-label="Artist profile highlights">
    <div><strong>{artistReleases.length}</strong><span>Verified releases</span></div>
    <div><strong>{picks.length}</strong><span>Artist picks</span></div>
    <div><strong>{photos.length}</strong><span>Gallery photos</span></div>
   </div>
   <nav className="fm-fan-artist-sections" aria-label="Artist page sections">
    <a href="#fan-artist-music">Music</a>
    {!selectedArtist.catalogueOnly&&<a href="#fan-artist-story">About</a>}
    {picks.length>0&&<a href="#fan-artist-picks">Artist picks</a>}
    {photos.length>0&&<a href="#fan-artist-gallery">Photos</a>}
    {interview&&<a href="#fan-artist-interview">Interview</a>}
   </nav>
   <section className="fm-artist-releases fm-fan-artist-panel" id="fan-artist-music">
    <div className="fm-fan-artist-heading"><span>DISCOGRAPHY</span><h3>Released on FACKTS</h3></div>
    {artistReleases.length===0?
     <p className="fm-artist-empty">No verified FACKTS releases are linked to this artist yet. Only confirmed performer credits appear here; shared-label uploads are not assigned automatically.</p>:
     <div className="fm-artist-release-list">{artistReleases.map(release=><article key={release.id}>
      <button type="button" className="fm-artist-release-cover" onClick={()=>onPlay(release)} aria-label={"Play "+release.title}>
       {release.has_cover?<img src={"/api/releases/"+release.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}
      </button>
      <div><strong>{release.title}</strong><small>{release.collection||"Single"}</small></div>
      <button type="button" onClick={()=>onPlay(release)}>▶ Listen</button>
      <Link href={"/billboard/"+release.id} aria-label={"View "+release.title+" release details"}>Details ↗</Link>
     </article>)}</div>}
   </section>
   {!selectedArtist.catalogueOnly&&<section className="fm-fan-artist-panel fm-fan-artist-about" id="fan-artist-story">
    <div><div className="fm-fan-artist-heading"><span>THE ARTIST</span><h3>About {selectedArtist.name}</h3></div>
     <p>{selectedArtist.bio||selectedArtist.tagline||"This artist has not added their story yet."}</p>
     <div className="fm-fan-artist-tags">{selectedArtist.location&&<span>{selectedArtist.location}</span>}
      {selectedArtist.genres.map(tag=><span key={tag}>{tag}</span>)}</div>
    </div>
    {(selectedArtist.socialUrl||selectedArtist.streamingUrl||fullHref)&&<div className="fm-fan-artist-links">
      <h4>Find {selectedArtist.name}</h4>
      {selectedArtist.streamingUrl&&<a href={selectedArtist.streamingUrl} target="_blank" rel="noopener noreferrer">Listen on external platform ↗</a>}
      {selectedArtist.socialUrl&&<a href={selectedArtist.socialUrl} target="_blank" rel="noopener noreferrer">Social profile ↗</a>}
      {fullHref&&<Link href={fullHref}>Full FACKTS profile ↗</Link>}
    </div>}
   </section>}
   {picks.length>0&&<section className="fm-fan-artist-panel" id="fan-artist-picks">
    <div className="fm-fan-artist-heading"><span>CURATED BY THE ARTIST</span><h3>Artist picks</h3></div>
    <p className="fm-fan-artist-subnote">Selected music from this artist's public profile. These are not automatically counted as their own releases.</p>
    <div className="fm-fan-artist-picks">{picks.map((song,index)=><a href={song.url} target="_blank" rel="noopener noreferrer" key={song.url+"-"+index}>
     <span>{String(index+1).padStart(2,"0")}</span><strong>{song.title}</strong><small>{sourceLabel(song.url)} ↗</small>
    </a>)}</div>
   </section>}
   {photos.length>0&&<section className="fm-fan-artist-panel" id="fan-artist-gallery">
    <div className="fm-fan-artist-heading"><span>BEHIND THE SOUND</span><h3>Photo gallery</h3></div>
    <div className="fm-fan-artist-gallery">{photos.map((photo,index)=><a href={photo} key={photo} target="_blank" rel="noopener noreferrer" aria-label={"Open "+selectedArtist.name+" photo "+(index+1)}>
     <img src={photo} alt={selectedArtist.name+" — gallery photo "+(index+1)} loading="lazy"/>
    </a>)}</div>
   </section>}
   {interview&&<section className="fm-fan-artist-panel" id="fan-artist-interview">
    <div className="fm-fan-artist-heading"><span>IN CONVERSATION</span><h3>{interview.title}</h3></div>
    {embed&&<div className="fm-fan-artist-interview"><iframe src={embed} loading="lazy" title={interview.title} allow="encrypted-media; picture-in-picture" allowFullScreen/></div>}
    <a className="fm-fan-artist-external" href={interview.url} target="_blank" rel="noopener noreferrer">Watch the interview ↗</a>
   </section>}
   {highlights.length>0&&<section className="fm-fan-artist-panel" id="fan-artist-highlights">
    <div className="fm-fan-artist-heading"><span>BEYOND THE MUSIC</span><h3>Highlights</h3></div>
    <ul className="fm-fan-artist-highlights">{highlights.map((item,index)=><li key={index}>{item}</li>)}</ul>
   </section>}
  </div>:<>
   <div className="fm-artist-filters">
    <label><span className="sr-only">Search artists</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search artists, sound or city…"/></label>
    <div role="group" aria-label="Music genres">{genres.map(item=><button type="button" key={item} aria-pressed={genre===item} onClick={()=>setGenre(item)}>{item}</button>)}</div>
   </div>
   <div className="fm-artist-grid">{filtered.map(artist=><article className="fm-artist-card" key={artist.id}>
    <button type="button" className="fm-artist-open" onClick={()=>setSelected(artist.id)}>
     <div className="fm-artist-cover">{artistPhoto(artist)?<img src={artistPhoto(artist)!} alt="" loading="lazy"/>:<span>{artistName(artist)}</span>}</div>
     <span className="fm-artist-card-copy"><strong>{artist.name}</strong><small>{artist.genres.slice(0,2).join(" · ")||artist.location||"FACKTS Music Artist"}</small>
      <span>{artistTracks(artist).length} verified releases</span></span>
    </button>
    <div className="fm-artist-card-actions"><button type="button" onClick={()=>setSelected(artist.id)}>View artist →</button></div>
   </article>)}</div>
   {!filtered.length&&<div className="fm-artist-empty">No public artist profiles match that search. Try a different sound or name.</div>}
  </>}
 </section>;
}
