import "server-only";
import {createAdminClient} from "./supabase/admin";

export type MusicArtist={
 id:string;name:string;avatar:string|null;hero:string|null;bio:string;tagline:string;
 location:string;genres:string[];slug:string;roles:string[];
};
// This directory only includes public profiles. Private project profiles must not leak
// through fans' listening pages, even if someone contributes to a public recording.
export async function publicMusicArtists():Promise<MusicArtist[]>{
 const {data,error}=await createAdminClient().from("profiles")
  .select("id,stage_name,nickname,full_name,avatar_url,hero_image_url,bio,epk_tagline,location,skills_genres,creator_types,public_slug")
  .eq("profile_visibility","public").eq("account_status","active")
  .contains("creator_types",["Artist"])
  .order("stage_name",{ascending:true,nullsFirst:false}).limit(150);
 if(error)throw Error("Artist profiles could not be loaded.");
 return (data||[]).map(person=>({
  id:person.id,name:person.stage_name||person.nickname||person.full_name||"FACKTS Artist",
  avatar:person.avatar_url||null,hero:person.hero_image_url||null,
  bio:person.bio||"",tagline:person.epk_tagline||"",
  location:person.location||"",genres:Array.isArray(person.skills_genres)?person.skills_genres.slice(0,6):[],
  roles:Array.isArray(person.creator_types)?person.creator_types:[],
  slug:person.public_slug||person.id
 }));
}
