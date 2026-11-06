import Link from "next/link";
import type {FanHeroConfig} from "../lib/fanHeroConfig";

// Shared by the public chart, fan tabs and fan profile. Only the selected,
// published area is rendered; disabled heroes retain their automatic design.
export default function ConfiguredFanHero({
 hero,fallbackImage="/branding/fackts-creative-community.jpg"
}:{hero:FanHeroConfig;fallbackImage?:string}){
 const image=hero.releaseId&&/^[a-f0-9-]{36}$/i.test(hero.releaseId)
  ?"/api/releases/"+hero.releaseId+"/media?kind=cover"
  :hero.image||fallbackImage;
 const cta=hero.ctaHref.startsWith("/")&&!hero.ctaHref.startsWith("//")
  ?hero.ctaHref
  :hero.ctaHref.startsWith("https://")?hero.ctaHref:"";
 return <section className={"fm-configured-hero fm-hero-"+hero.layout} data-hero-area={hero.area} aria-label={hero.title||"FACKTS Music"}>
  <img className="fm-configured-hero-image" src={image} alt="" aria-hidden="true" loading="eager"/>
  <div className="fm-configured-hero-shade" aria-hidden="true"/>
  <div className="fm-configured-hero-copy">
   <span className="fm-configured-hero-eyebrow">{hero.eyebrow||"FACKTS MUSIC"}</span>
   <h1>{hero.title}</h1>
   {hero.description&&<p>{hero.description}</p>}
   {cta&&hero.ctaLabel&&<Link className="fm-hero-custom-cta" href={cta}>{hero.ctaLabel} <span aria-hidden="true">↗</span></Link>}
  </div>
 </section>;
}
