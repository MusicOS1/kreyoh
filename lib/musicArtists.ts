import "server-only";
import {createAdminClient} from "./supabase/admin";
import type {ArtistPick,MusicArtist} from "./musicArtistsTypes";

// Public artist pages must never disclose private project or account metadata.
function publicUrl(value:unknown):string|null {
 if(typeof value!=="string"||!value.trim())return null;
 try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.toString():null;}
 catch{return null;}
}
function publicList(value:unknown,max:number):string[] {
 return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"&&Boolean(item.trim())).slice(0,max):[];
}
function publicPicks(value:unknown):ArtistPick[] {
 if(!Array.isArray(value))return [];
 return value.flatMap(item=>{
  if(!item||typeof item!=="object")return [];
  const obj=item as Record<string,unknown>,title=typeof obj.title==="string"?obj.title.trim():"",url=publicUrl(obj.url);
  return title&&url?[{title:title.slice(0,140),url}]:[];
 }).slice(0,5);
}
// A profile must explicitly opt into public visibility and Artist identity.
// The legacy Joseph Millighan identity is repaired separately; no other
// professional or uploader is silently relabelled as an artist.
export async function publicMusicArtists():Promise<MusicArtist[]> {
 const {data,error}=await createAdminClient().from("profiles")
  .select("id,stage_name,nickname,full_name,avatar_url,hero_image_url,bio,epk_tagline,location,skills_genres,creator_types,public_slug,social_links,streaming_links,top_songs,photo_catalog,interview_title,interview_url,achievements")
  .eq("profile_visibility","public").eq("account_status","active")
  .contains("creator_types",["Artist"])
  .order("stage_name",{ascending:true,nullsFirst:false}).limit(150);
 if(error)throw Error("Artist profiles could not be loaded.");
 return (data||[]).map(person=>{
  const interviewUrl=publicUrl(person.interview_url);
  return {
   id:person.id,name:person.stage_name||person.nickname||person.full_name||"FACKTS Artist",
   avatar:publicUrl(person.avatar_url),hero:publicUrl(person.hero_image_url),
   bio:person.bio||"",tagline:person.epk_tagline||"",
   location:person.location||"",genres:publicList(person.skills_genres,6),
   roles:publicList(person.creator_types,8),slug:person.public_slug||person.id,
   socialUrl:publicUrl(person.social_links?.primary),streamingUrl:publicUrl(person.streaming_links?.primary),
   topSongs:publicPicks(person.top_songs),
   photos:publicList(person.photo_catalog,5).map(publicUrl).filter((value):value is string=>Boolean(value)),
   achievements:publicList(person.achievements,12),
   interview:interviewUrl?{title:person.interview_title||"Artist interview",url:interviewUrl}:null
  };
 });
}
