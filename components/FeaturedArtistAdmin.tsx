"use client";
import {useActionState,useState} from "react";
import Link from "next/link";
import type {MusicArtist} from "../lib/musicArtistsTypes";
import {saveDiscoverFeaturedArtist} from "../app/admin/(control)/discovery/featured-artist-actions";

export default function FeaturedArtistAdmin({
 artists,selectedArtistId,customForYouEnabled
}:{artists:MusicArtist[];selectedArtistId:string;customForYouEnabled:boolean}){
 const [selected,setSelected]=useState(selectedArtistId);
 const [state,action,pending]=useActionState(saveDiscoverFeaturedArtist,{ok:false,message:""});
 const artist=artists.find(person=>person.id===selected);
 const effectiveName=artist?.name||"Automatic: the first eligible artist";
 return <section className="fm-featured-artist-editor" aria-labelledby="fm-featured-artist-title">
  <header>
   <span className="eyebrow">DISCOVER / FEATURED ARTIST</span>
   <h2 id="fm-featured-artist-title">Choose the featured artist</h2>
   <p>Select the artist fans see in Discover's main spotlight. Their public photo, profile and music are used automatically. This is separate from Artwork of the Week.</p>
  </header>
  <form action={action} className="fm-featured-artist-form">
   <label htmlFor="fm-discover-featured-artist">Artist to feature
    <select id="fm-discover-featured-artist" name="artistId" value={selected} onChange={e=>setSelected(e.target.value)}>
     <option value="">Automatic selection (current behaviour)</option>
     {artists.map(person=><option key={person.id} value={person.id}>
      {person.name}{person.hero||person.avatar?"":" — no public photo"}
     </option>)}
    </select>
   </label>
   <div className="fm-featured-artist-preview">
    {artist?.hero||artist?.avatar?<img src={artist.hero||artist.avatar||""} alt="" />:<span className="fm-featured-artist-initial">{artist?.name?.slice(0,1)||"♫"}</span>}
    <div>
     <span>Discover spotlight selection</span>
     <strong>{effectiveName}</strong>
     <small>{artist?artist.genres.slice(0,2).join(" · ")||artist.location||"FACKTS Artist":"We'll choose an eligible public artist with a photo."}</small>
    </div>
   </div>
   {customForYouEnabled&&<p className="fm-featured-artist-warning">A custom Fan Home / For You hero is currently enabled. That custom banner takes precedence over the artist spotlight. Disable it in Hero Studio to display this selected artist.</p>}
   {!artists.length&&<p className="fm-featured-artist-warning">No active public Artist profiles are currently available to feature.</p>}
   <div className="fm-featured-artist-actions">
    <button type="submit" disabled={pending}>{pending?"Saving selection…":"Save featured artist"}</button>
    <Link href="/fan?tab=For%20You" target="_blank" rel="noopener noreferrer">Open Discover ↗</Link>
   </div>
   {state.message&&<p role="status" className={state.ok?"hero-admin-success":"hero-admin-error"}>{state.message}</p>}
  </form>
 </section>;
}
