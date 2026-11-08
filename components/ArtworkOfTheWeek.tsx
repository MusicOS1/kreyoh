import Link from "next/link";
import type {publishedArtworkOfWeek} from "../lib/artworkOfWeek";

type FeaturedArtwork=NonNullable<ReturnType<typeof publishedArtworkOfWeek>>;

/** A small companion spotlight beside the featured artist—not a second hero. */
export default function ArtworkOfTheWeek({feature}:{feature:FeaturedArtwork}){
 const {entry,artwork,release,href}=feature;
 const title=release?.title||entry.eyebrow||"Featured artwork";
 const artist=release?.artist_name||entry.description;
 const details=<>
  <div className="fm-artwork-week-cover">
   <img src={artwork} alt={title+" cover artwork"} loading="lazy"/>
  </div>
  <div className="fm-artwork-week-copy">
   <span className="fm-artwork-week-eyebrow">{entry.title||"Album Artwork of the Week"}</span>
   <h3>{title}</h3>
   {artist&&<p>{artist}</p>}
   {href&&<span className="fm-artwork-week-action">
    {entry.ctaLabel||"View the release"} <span aria-hidden="true">↗</span>
   </span>}
  </div>
 </>;
 return <section className="fm-artwork-week" aria-label="Album Artwork of the Week">
  {href?<Link className="fm-artwork-week-card" href={href}
   aria-label={"Explore artwork of the week: "+title}>{details}</Link>:
   <div className="fm-artwork-week-card">{details}</div>}
 </section>;
}
