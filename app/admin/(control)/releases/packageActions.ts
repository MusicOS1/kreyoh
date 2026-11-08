"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";

export const releaseFormats=["project","ep","mixtape","album","lp"] as const;
export type ReleaseFormat=(typeof releaseFormats)[number];
export type PackageFormatState={ok:boolean;message:string};

export async function changeReleasePackageFormat(_state:PackageFormatState,form:FormData):Promise<PackageFormatState>{
 try{
  const actor=await requireControlRoomPermission("music");
  const packageId=String(form.get("package_id")||"").trim();
  const kind=String(form.get("format")||"").trim();
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(packageId)||!releaseFormats.includes(kind as ReleaseFormat))
   throw new Error("Choose a valid collection and release type.");
  const admin=createAdminClient();
  const {data:packageRow,error:readError}=await admin.from("music_release_packages")
   .select("id,name,format").eq("id",packageId).maybeSingle();
  if(readError||!packageRow)throw new Error("Collection not found. Refresh the page.");
  if(packageRow.format===kind)return {ok:true,message:"This collection already has that type."};
  const {error:auditError}=await admin.from("platform_events").insert({
   user_id:actor.id,category:"music",event_name:"release_package_classification_requested",
   entity_type:"release_package",entity_id:packageId,
   metadata:{name:packageRow.name,from:packageRow.format,to:kind}
  });
  if(auditError)throw new Error("Cannot audit this change; no classification was updated.");
  const {data:updated,error:updateError}=await admin.from("music_release_packages")
   .update({format:kind,updated_by:actor.id,updated_at:new Date().toISOString()})
   .eq("id",packageId).eq("format",packageRow.format).select("id").maybeSingle();
  if(updateError||!updated)throw new Error("The collection changed; refresh and try again.");
  await admin.from("platform_events").insert({
   user_id:actor.id,category:"music",event_name:"release_package_classified",
   entity_type:"release_package",entity_id:packageId,
   metadata:{name:packageRow.name,from:packageRow.format,to:kind}
  });
  revalidatePath("/admin/releases");revalidatePath("/admin/releases/packages/"+packageId);
  return {ok:true,message:"Collection set to "+kind.toUpperCase()+". Song audio, credits and listener data were not changed."};
 }catch(error){
  return {ok:false,message:error instanceof Error?error.message:"Release type could not be saved."};
 }
}
