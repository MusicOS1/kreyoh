"use client";
import Link from "next/link";
import type {MusicArtist} from "../../lib/musicArtistsTypes";
import {PlayIcon,UsersIcon,ArrowUpRight} from "../Icons";
type Props={artist:MusicArtist|null;track?:{id:string;title:string}|null;
 onPlay:(id:string)=>void;onOpen:(id:string)=>void;onFollow:(id:string)=>void;
 following:boolean;followPending:boolean;userId?:string;fallbackImage?:string};
export default function StreamArtistHero({artist,track,onPlay,onOpen,onFollow,following,followPending,userId,fallbackImage}:Props){
 if(!artist)return <section className="fs-hero fs-hero-empty">
   <div className="fs-hero-content"><div className="fs-eyebrow">WELCOME TO FACKTS MUSIC</div>
   <h1>Your next favourite sound starts here.</h1><p>Discover independent artists and the music they are making.</p>
   <Link className="fs-button fs-button-primary" href="/creators"><UsersIcon size={18}/> Meet the artists</Link></div>
   {fallbackImage&&<img src={fallbackImage} alt="" className="fs-hero-art"/>}
 </section>;
 const photo=artist.hero||artist.avatar;
 const href="/creators/"+encodeURIComponent(artist.slug||artist.id);
 return <section className="fs-hero" aria-label={"Spotlight: "+artist.name}>
  {photo&&<img src={photo} alt={artist.name} className="fs-hero-art" loading="eager"/>}
  <div className="fs-hero-gradient" aria-hidden="true"/>
  <div className="fs-hero-content">
   <div className="fs-eyebrow"><span className="fs-status-dot"/> ARTIST SPOTLIGHT</div>
   <h1>{artist.name}</h1>
   <p>{artist.tagline||artist.bio||"Get to know the person behind the music."}</p>
   <div className="fs-artist-metadata">
    {artist.location&&<span>{artist.location}</span>}
    {artist.genres.slice(0,2).map(genre=><span key={genre}>{genre}</span>)}
   </div>
   <div className="fs-hero-actions">
    {track&&<button type="button" className="fs-button fs-button-primary" onClick={()=>onPlay(track.id)} aria-label={"Play "+track.title}><PlayIcon size={17}/> Play music</button>}
    {userId?
     <button type="button" className="fs-button fs-button-outline" aria-pressed={following} aria-busy={followPending} disabled={followPending} onClick={()=>onFollow(artist.id)}>{following?"✓ Following":"+ Follow"}</button>:
     <Link href={"/login?next="+encodeURIComponent(href)} className="fs-button fs-button-outline">+ Follow</Link>}
    <button type="button" className="fs-artist-open" onClick={()=>onOpen(artist.id)}>Artist profile <ArrowUpRight size={16}/></button>
   </div>
  </div>
 </section>;
}
