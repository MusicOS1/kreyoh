"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {publicMusicArtists} from "../../../../lib/musicArtists";
import {FEATURED_ARTIST_KEY} from "../../../../lib/featuredArtist";

export type FeaturedArtistSaveState={ok:boolean;message:string};
export async function saveDiscoverFeaturedArtist(
 _previous:FeaturedArtistSaveState,
 form:FormData
):Promise<FeaturedArtistSaveState>{
 try{
  const user=await requireControlRoomPermission("music");
  const artistId=String(form.get("artistId")||"").trim();
  if(artistId&&!/^[a-f0-9-]{36}$/i.test(artistId))
   throw new Error("Choose a valid featured artist.");
  // Feature only active, public Artist profiles. Never expose or promote private users.
  if(artistId){
   const eligible=await publicMusicArtists();
   if(!eligible.some(person=>person.id===artistId))
    throw new Error("This profile is not an active, public artist. Select another.");
  }
  const {error}=await createAdminClient().from("system_settings").upsert({
   setting_key:FEATURED_ARTIST_KEY,
   setting_value:{artistId},
   description:"Discover artist spotlight selection; empty means automatic.",
   updated_by:user.id,
   updated_at:new Date().toISOString()
  },{onConflict:"setting_key"});
  if(error)throw new Error("Could not save featured artist: "+error.message);
  for(const path of ["/fan","/listen","/admin/discovery"])revalidatePath(path);
  return {ok:true,message:artistId?
   "Featured artist saved. Discover now uses the selected artist.":"Automatic artist selection restored."};
 }catch(error){
  return {ok:false,message:error instanceof Error?error.message:"Could not save featured artist."};
 }
}
