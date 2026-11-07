import "server-only";
import {createAdminClient} from "./supabase/admin";

export type ShowParticipant={
 id:string;name:string;slug:string;avatar:string|null;roles:string[];aliases:string[];
};
/** Public, active creative profiles are eligible to appear in a show lineup.
 * They do NOT have to change their creator_types to Artist; composers,
 * producers and songwriters can be credited under their existing role.
 * Never return private/draft/deactivated profiles.
 */
export async function publicShowParticipants(names:string[]):Promise<ShowParticipant[]>{
 const requested=Array.from(new Set(names.map(n=>n.trim()).filter(Boolean))).slice(0,25);
 if(!requested.length)return [];
 const admin=createAdminClient();
 const columns="id,stage_name,nickname,public_slug,avatar_url,hero_image_url,creator_types";
 const q=()=>admin.from("profiles").select(columns).eq("profile_visibility","public").eq("account_status","active");
 const [byStage,byNickname]=await Promise.all([
  q().in("stage_name",requested).limit(25),
  q().in("nickname",requested).limit(25)
 ]);
 if(byStage.error||byNickname.error)throw Error("Could not load public show participant profiles.");
 const normal=(s:string)=>s.trim().toLocaleLowerCase("en");
 const wanted=new Set(requested.map(normal));
 const matches=[...(byStage.data||[]),...(byNickname.data||[])];
 const unique=new Map<string,ShowParticipant>();
 for(const profile of matches){
  const stage=profile.stage_name||"",nick=profile.nickname||"";
  if(!wanted.has(normal(stage))&&!wanted.has(normal(nick)))continue;
  if(unique.has(profile.id))continue;
  unique.set(profile.id,{
   id:profile.id,
   name:stage||nick,
   aliases:[stage,nick].filter(Boolean),
   slug:profile.public_slug||profile.id,
   avatar:profile.avatar_url||profile.hero_image_url||null,
   roles:Array.isArray(profile.creator_types)?profile.creator_types.filter((r:unknown):r is string=>typeof r==="string").slice(0,3):[]
  });
 }
 return [...unique.values()];
}
