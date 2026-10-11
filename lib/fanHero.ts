import "server-only";
import {createAdminClient} from "./supabase/admin";

import {fanHeroAreas,heroKey,type FanHeroArea,type FanHeroConfig} from "./fanHeroConfig";
export {fanHeroAreas,heroKey,heroAreaForTab} from "./fanHeroConfig";
export type {FanHeroArea,FanHeroConfig} from "./fanHeroConfig";
const validLayout=(layout:string):FanHeroConfig["layout"]=>["editorial","immersive","spotlight"].includes(layout)?layout as FanHeroConfig["layout"]:"editorial";
export function normalizeHero(area:FanHeroArea,value:unknown):FanHeroConfig{
 const source=(value&&typeof value==="object"&&!Array.isArray(value)?value:{}) as Record<string,unknown>;
 const field=(key:string,max:number)=>typeof source[key]==="string"?String(source[key]).slice(0,max):"";
 return {area,enabled:source.enabled===true,title:field("title",100),eyebrow:field("eyebrow",70),
  description:field("description",300),image:field("image",600),releaseId:field("releaseId",36),
  layout:validLayout(field("layout",30)),ctaLabel:field("ctaLabel",45),ctaHref:field("ctaHref",250)};
}
export async function fanHeroSettings():Promise<Record<FanHeroArea,FanHeroConfig>>{
 const keys=fanHeroAreas.map(item=>heroKey(item.id));
 const{data,error}=await createAdminClient().from("system_settings").select("setting_key,setting_value").in("setting_key",keys);
 if(error)throw new Error("Could not load hero configuration.");
 const values=new Map((data||[]).map(item=>[item.setting_key,item.setting_value]));
 return Object.fromEntries(fanHeroAreas.map(item=>[item.id,normalizeHero(item.id,values.get(heroKey(item.id)))])) as Record<FanHeroArea,FanHeroConfig>;
}
export function heroImage(hero:FanHeroConfig|undefined,fallback:string):string{
 if(!hero?.enabled)return fallback;
 if(hero.releaseId&&/^[a-f0-9-]{36}$/i.test(hero.releaseId))return "/api/releases/"+hero.releaseId+"/media?kind=cover";
 return hero.image||fallback;
}
