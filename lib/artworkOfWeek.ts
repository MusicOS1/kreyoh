import type {FanHeroConfig} from "./fanHeroConfig";

export type PublishedArtwork={id:string;title:string;artist_name:string;has_cover:boolean};
type HeroCollection={artwork:FanHeroConfig;profile:FanHeroConfig};

/** The older promotion was accidentally saved as a personal-profile hero.
 * Until an Artwork of the Week entry is saved, show it on Discover instead.
 * A deliberately disabled dedicated entry takes precedence over legacy content.
 */
export function isMisplacedArtworkHero(hero:FanHeroConfig|undefined){
 return Boolean(hero?.enabled&&/\b(?:album\s+)?(?:art\s*work|cover\s+art)\s+of\s+the\s+week\b/i.test(hero.title));
}
const clean=(text:string)=>text.trim().replace(/\s+/g," ").toLocaleLowerCase("en");
function matchingRelease(hero:FanHeroConfig,releases:PublishedArtwork[]){
 if(hero.releaseId)return releases.find(release=>release.id===hero.releaseId&&release.has_cover)||null;
 if(!hero.eyebrow)return null;
 const candidates=releases.filter(release=>release.has_cover&&clean(release.title)===clean(hero.eyebrow));
 if(candidates.length===1)return candidates[0];
 if(candidates.length>1&&hero.description){
  const byArtist=candidates.filter(release=>clean(hero.description).includes(clean(release.artist_name)));
  if(byArtist.length===1)return byArtist[0];
 }
 return null;
}
export function artworkOfWeekSetting(heroes:HeroCollection,releases:PublishedArtwork[]):FanHeroConfig{
 const current=heroes.artwork;
 if(current.enabled||current.title||current.image||current.releaseId)return current;
 const legacy=heroes.profile;
 if(!isMisplacedArtworkHero(legacy))return current;
 const release=matchingRelease(legacy,releases);
 return {...legacy,area:"artwork",releaseId:release?.id||"",
  ctaLabel:legacy.ctaLabel||"View the release",ctaHref:legacy.ctaHref||(
   release?"/billboard/"+release.id:"")};
}
export function publishedArtworkOfWeek(heroes:HeroCollection,releases:PublishedArtwork[]){
 const entry=artworkOfWeekSetting(heroes,releases);
 if(!entry.enabled)return null;
 const release=matchingRelease(entry,releases);
 const artwork=entry.image||(release?"/api/releases/"+release.id+"/media?kind=cover":"");
 if(!artwork)return null; // Never publish the generic placeholder as featured art.
 const href=release?"/billboard/"+release.id:
  entry.ctaHref.startsWith("/")&&!entry.ctaHref.startsWith("//")?entry.ctaHref:
  entry.ctaHref.startsWith("https://")?entry.ctaHref:"";
 return {entry,artwork,release,href};
}
