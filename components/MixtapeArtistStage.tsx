import type {ReactNode} from "react";
type Props={name:string;portrait?:string|null;eyebrow?:string;description?:string|null;genres?:string[];location?:string|null;actions:ReactNode;className?:string};
export default function MixtapeArtistStage({name,portrait,eyebrow="THE PEOPLE BEHIND THE SOUND",description,genres=[],location,actions,className=""}:Props){
 return <section className={"mx-artist-stage "+className} aria-label={name+" artist spotlight"}>
   <div className="mx-stage-photo">{portrait?<img src={portrait} alt={name} loading="eager"/>:<div className="mx-stage-photo-fallback" aria-hidden="true">{name.slice(0,2).toUpperCase()}</div>}</div>
   <div className="mx-stage-scrim" aria-hidden="true"/>
   <div className="mx-stage-text">
    <span className="mx-stage-eyebrow">{eyebrow}</span>
    <h1>{name}</h1>
    <p>{description||"Discover the artist behind the sound."}</p>
    {(genres.length>0||location)&&<div className="mx-stage-meta">{location&&<span>{location}</span>}{genres.slice(0,2).map(genre=><span key={genre}>{genre}</span>)}</div>}
    <div className="mx-stage-actions">{actions}</div>
   </div>
   <span className="mx-stage-stamp" aria-hidden="true">FACKTS<br/>MUSIC</span>
 </section>;
}
