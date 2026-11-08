import "server-only";
import {createAdminClient} from "./supabase/admin";

export const FEATURED_ARTIST_KEY="music_discover_featured_artist";
export async function selectedDiscoverArtistId():Promise<string>{
 const {data,error}=await createAdminClient().from("system_settings")
  .select("setting_value").eq("setting_key",FEATURED_ARTIST_KEY).maybeSingle();
 if(error)throw new Error("Featured artist setting could not be loaded.");
 const id=data?.setting_value?.artistId;
 return typeof id==="string"&&/^[a-f0-9-]{36}$/i.test(id)?id:"";
}
