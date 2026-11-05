"use server";

import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {uuidPattern} from "../../../../lib/community";

export type ReleaseEditState={ok:boolean;message:string};
const read=(fd:FormData,key:string)=>String(fd.get(key)??"").trim().replace(/\r\n/g,"\n");
const validStatus=["draft","pending","published","rejected"];
const editable=["title","artist_name","collection","genre","description","credits","track_number","explicit","debut","release_at"] as const;
function dateValue(value:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error("Enter a valid release date and time.");
 const date=new Date(value+":00+03:00");
 if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<2000||date.getUTCFullYear()>2100)throw Error("Enter a valid release date.");
 const nairobi=new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date).replace(" ","T");
 if(nairobi!==value)throw Error("The release date is not valid.");
 return date.toISOString();
}
export async function editAdminRelease(_previous:ReleaseEditState,fd:FormData):Promise<ReleaseEditState>{
 try{
  const actor=await requireControlRoomPermission("music");
  const id=read(fd,"release_id"),reason=read(fd,"reason");
  if(!uuidPattern.test(id))throw Error("Choose an existing release.");
  if(reason.length<10||reason.length>500)throw Error("Explain the correction in 10–500 characters for the audit trail.");
  const admin=createAdminClient();
  const {data:release,error:readError}=await admin.from("music_releases").select("*").eq("id",id).maybeSingle();
  if(readError||!release)throw Error("This release could not be found.");
  if(!validStatus.includes(release.status))throw Error("This release is not editable in its current status.");
  const title=read(fd,"title"),artistName=read(fd,"artist_name"),collection=read(fd,"collection"),
   genre=read(fd,"genre"),description=read(fd,"description"),credits=read(fd,"credits");
  const trackNumber=Number(read(fd,"track_number"));
  const explicit=read(fd,"explicit")==="true",debut=read(fd,"debut")==="true";
  if(!title||title.length>160)throw Error("Enter a title of up to 160 characters.");
  if(!artistName||artistName.length>160)throw Error("Enter an artist display credit of up to 160 characters.");
  if(collection.length>160||genre.length>80||description.length>2000||credits.length>5000)throw Error("One or more fields exceed the permitted length.");
  if(!Number.isSafeInteger(trackNumber)||trackNumber<1||trackNumber>999)throw Error("Enter a track number between 1 and 999.");
  const releaseAt=dateValue(read(fd,"release_at"));
  const updated={title,artist_name:artistName,collection,genre,description,credits,track_number:trackNumber,explicit,debut,release_at:releaseAt};
  if(release.source_track_id&&(artistName!==release.artist_name||credits!==release.credits)){
   throw Error("Project-linked artist credits and contributor details must be revised in the project release workflow to preserve approved splits.");
  }
  const before=Object.fromEntries(editable.map(key=>[key,key==="release_at"?new Date(release.release_at).toISOString():release[key]]));
  const changes=Object.fromEntries(editable.filter(key=>String(before[key])!==String(updated[key])).map(key=>[key,{from:before[key],to:updated[key]}]));
  if(!Object.keys(changes).length)return{ok:true,message:"No changes to save."};
  // Write the audit intent first so a failure never leaves an unaudited metadata edit.
  const {error:auditError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:"release_metadata_correction_requested",category:"music",
   entity_type:"release",entity_id:id,metadata:{reason,changes,release_status:release.status}
  });
  if(auditError)throw Error("Could not record this correction. No release details were changed.");
  let query=admin.from("music_releases").update(updated).eq("id",id).eq("status",release.status)
   .eq("title",release.title).eq("artist_name",release.artist_name);
  const {data:changed,error:saveError}=await query.select("id").maybeSingle();
  if(saveError||!changed)throw Error("The release changed while you were editing. Refresh and retry; your correction was not applied.");
  const {error:completedError}=await admin.from("platform_events").insert({
   user_id:actor.id,event_name:"release_metadata_corrected",category:"music",
   entity_type:"release",entity_id:id,metadata:{reason,changes,release_status:release.status}
  });
  if(completedError)console.error("Release edited; correction intent is preserved but completion audit insert failed.",{id});
  for(const path of ["/admin/releases","/admin/catalogue","/billboard",`/billboard/${id}`,"/fan","/listen","/creators","/admin/analytics"])revalidatePath(path);
  return{ok:true,message:completedError?"Changes saved; audit completion needs a review.":"Release details saved. The song ID, audio, artwork and all listener engagement were preserved."};
 }catch(error){
  const message=error instanceof Error?error.message:"Could not save this correction.";
  if(!/^(Choose |Explain |This release |Enter |One or more |Project-linked |Could not record |The release changed |The release date )/.test(message)){
   console.error("Admin release correction failed:",error);
   return {ok:false,message:"The edit could not be saved. The release has not been intentionally altered."};
  }
  return{ok:false,message};
 }
}
