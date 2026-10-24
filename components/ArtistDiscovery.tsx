"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import type {MusicArtist} from "../lib/musicArtistsTypes";
import {creditedToArtist} from "../lib/releaseArtistMatch";
type Release={id:string;title:string;artist_id:string;artist_name:string;has_cover:boolean;collection:string;genre?:string;release_at:string;votes:number};
type ArtistEntry=MusicArtist&{catalogueOnly?:boolean};
export default function ArtistDiscovery({
 artists,releases,viewerId,following,onFollow,onPlay,initialArtistId,followBusy=false,followNotice
}:{artists:MusicArtist[];releases:Release[];viewerId?:string;
 following:(id:string)=>boolean;onFollow:(id:string)=>void;onPlay:(release:Release)=>void;initialArtistId?:string|null;followBusy?:boolean;followNotice?:string}){
 const [selected,setSelected]=useState<string|null>(initialArtistId||null);
 const [search,setSearch]=useState("");
 const [genre,setGenre]=useState("All");
 // Public releases can credit an act whose full profile has not yet been published.
 // Show only the already-public stage name, genre and cover in this case — never
 // expose private profile fields or assign someone else's releases to a profile.
 const directory=useMemo<ArtistEntry[]>(()=>{
  const extras=new Map<string,ArtistEntry>();
  for(const release of releases){
   const attributed=artists.some(person=>person.id===release.artist_id&&creditedToArtist(release.artist_name,person.name));
   if(attributed)continue;
   const key=release.artist_name.trim().toLocaleLowerCase("en");
   if(!key)continue;
   const existing=extras.get(key);
   if(!existing)extras.set(key,{
    id:"catalogue:"+key,name:release.artist_name,avatar:release.has_cover?"/api/releases/"+release.id+"/media?kind=cover":null,
    hero:null,bio:"Discover music already released by this act on FACKTS.",
    tagline:"FACKTS released music",location:"",genres:release.genre?[release.genre]:[],
    slug:"",roles:["Released artist"],catalogueOnly:true
   });
  }
  return [...artists,...extras.values()];
 },[artists,releases]);
 const selectedArtist=directory.find(artist=>artist.id===selected);
 const genres=useMemo(()=>["All",...new Set(directory.flatMap(artist=>artist.genres).filter(Boolean))].slice(0,12),[directory]);
 const filtered=directory.filter(artist=>(genre==="All"||artist.genres.includes(genre))&&
  [artist.name,artist.bio,artist.tagline,artist.location,...artist.genres].join(" ").toLowerCase().includes(search.toLowerCase()));
 const artistTracks=(artist:ArtistEntry)=>artist.catalogueOnly?releases.filter(release=>"catalogue:"+release.artist_name.trim().toLocaleLowerCase("en")===artist.id):releases.filter(release=>release.artist_id===artist.id&&creditedToArtist(release.artist_name,artist.name));
 const artistReleases=selectedArtist?artistTracks(selectedArtist):[];
 const artistName=(artist:MusicArtist)=>artist.name.trim()[0]?.toUpperCase()||"F";
 const artistPhoto=(artist:MusicArtist)=>artist.avatar||artist.hero;
 return <section className="fm-artist-room" aria-label="FACKTS artist discovery">
  <div className="fm-artist-intro">
   <span className="eyebrow">PEOPLE BEHIND THE MUSIC</span>
   <h2>Meet the artists. Stay for the sound.</h2>
   <p>Explore actual FACKTS artist profiles, follow the voices you love and play their published songs without leaving this listening space.</p>
  </div>
  {followNotice&&<p role="status">{followNotice}</p>}
  {selectedArtist?<div className="fm-artist-detail" key={selectedArtist.id}>
   <button type="button" className="fm-artist-back" onClick={()=>setSelected(null)}>← All artists</button>
   <div className="fm-artist-detail-hero">
    <div className="fm-artist-detail-photo">
     {artistPhoto(selectedArtist)?<img src={artistPhoto(selectedArtist)!} alt={selectedArtist.name}/>:<span>{artistName(selectedArtist)}</span>}
    </div>
    <div className="fm-artist-detail-info"><span className="eyebrow">FACKTS ARTIST</span><h3>{selectedArtist.name}</h3>
     <p>{selectedArtist.tagline||selectedArtist.bio||"Discover the sound and story behind this FACKTS artist."}</p>
     {selectedArtist.location&&<small>{selectedArtist.location}</small>}
     {selectedArtist.genres.length>0&&<div className="fm-artist-tags">{selectedArtist.genres.map(g=><span key={g}>{g}</span>)}</div>}
     <div className="fm-artist-detail-actions">
      {selectedArtist.catalogueOnly?<span>Official profile coming soon</span>:viewerId?<button type="button" disabled={followBusy} aria-busy={followBusy} onClick={()=>onFollow(selectedArtist.id)} aria-pressed={following(selectedArtist.id)}>{following(selectedArtist.id)?"✓ Following":"+ Follow artist"}</button>:<Link href={"/login?next="+encodeURIComponent("/fan?tab=Artists")}>Sign in to follow</Link>}
      <span>{artistReleases.length} released track{artistReleases.length===1?"":"s"} on FACKTS</span>
     </div>
    </div>
   </div>
   <div className="fm-artist-releases"><h4>Releases on FACKTS</h4>
    {artistReleases.length===0?<p className="fm-artist-empty">New releases from this artist will appear here after they are approved and published.</p>:
     <div className="fm-artist-release-list">{artistReleases.map(release=><article key={release.id}>
      <button type="button" className="fm-artist-release-cover" onClick={()=>onPlay(release)} aria-label={"Play "+release.title}>
       {release.has_cover?<img src={"/api/releases/"+release.id+"/media?kind=cover"} alt=""/>:<span>♫</span>}
      </button>
      <div><strong>{release.title}</strong><small>{release.collection||"Single"}</small></div>
      <button type="button" onClick={()=>onPlay(release)}>▶ Listen</button>
      <Link href={"/billboard/"+release.id} aria-label={"View "+release.title+" release details"}>Details ↗</Link>
     </article>)}</div>}
   </div>
  </div>:<>
   <div className="fm-artist-filters">
    <label><span className="sr-only">Search artists</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search artists, sound or city…"/></label>
    <div role="group" aria-label="Music genres">{genres.map(item=><button type="button" key={item} aria-pressed={genre===item} onClick={()=>setGenre(item)}>{item}</button>)}</div>
   </div>
   <div className="fm-artist-grid">{filtered.map(artist=><article className="fm-artist-card" key={artist.id}>
    <button type="button" className="fm-artist-open" onClick={()=>setSelected(artist.id)}>
     <div className="fm-artist-cover">
      {artistPhoto(artist)?<img src={artistPhoto(artist)!} alt=""/>:<span>{artistName(artist)}</span>}
     </div>
     <span className="fm-artist-card-copy"><strong>{artist.name}</strong><small>{artist.genres.slice(0,2).join(" · ")||artist.location||"FACKTS Music Artist"}</small>
     <span>{artistTracks(artist).length} published tracks</span></span>
    </button>
    <div className="fm-artist-card-actions">
     <button type="button" onClick={()=>setSelected(artist.id)}>Explore music →</button>
     {viewerId&&!artist.catalogueOnly&&<button type="button" disabled={followBusy} aria-busy={followBusy} aria-label={(following(artist.id)?"Unfollow ":"Follow ")+artist.name} aria-pressed={following(artist.id)} onClick={()=>onFollow(artist.id)}>{following(artist.id)?"♥":"♡"}</button>}
    </div>
   </article>)}</div>
   {!filtered.length&&<div className="fm-artist-empty">No public artist profiles match that search. Try a different sound or name.</div>}
  </>}
 </section>;
}
