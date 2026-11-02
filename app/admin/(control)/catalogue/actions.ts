"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const read=(data:FormData,key:string)=>String(data.get(key)||"").trim();
const oneOf=(value:string,options:string[])=>options.includes(value);
const page="/admin/catalogue";
function fail(message:string):never{redirect(page+"?error="+encodeURIComponent(message));}
export async function saveCatalogueAttribution(form:FormData){
 const actor=await requireControlRoomPermission("music");
 const admin=createAdminClient();
 const source=read(form,"source");
 const [kind,id]=source.split(":");
 if(!oneOf(kind,["release","demo"])||!uuid.test(id))fail("Choose an existing song or project demo.");
 const origin=read(form,"upload_origin");
 const ownership=read(form,"ownership_kind");
 const state=read(form,"verification_state");
 if(!oneOf(origin,["unknown","admin_upload","artist_upload"])||
    !oneOf(ownership,["unverified","artist","company","third_party","shared"])||
    !oneOf(state,["needs_review","verified"]))fail("Choose valid attribution and ownership options.");
 const creditedName=read(form,"credited_artist_name").slice(0,130);
 const creditedId=read(form,"credited_artist_profile_id");
 const uploadedBy=read(form,"uploaded_by_profile_id");
 const creditVerified=form.get("credit_verified")==="on";
 const creditEvidence=read(form,"credit_evidence_reference").slice(0,350);
 const rightsName=read(form,"rights_holder_name").slice(0,150);
 const evidence=read(form,"rights_evidence_reference").slice(0,350);
 const note=read(form,"attribution_note").slice(0,1000);
 if(creditedId&&!uuid.test(creditedId)||uploadedBy&&!uuid.test(uploadedBy))fail("Choose a valid person.");
 if(creditVerified&&(!creditedId||!creditedName||!creditEvidence))fail("To verify an artist link, select the actual Artist account and add credit evidence.");
 if(state==="verified"&&(ownership==="unverified"||!rightsName||!evidence))fail("Verified ownership needs a rights holder and evidence reference.");
 if((ownership!=="unverified"||state==="verified")&&!creditedName)fail("Enter the credited artist or group name.");
 if(creditedId){
  const {data:person,error}=await admin.from("profiles").select("id,creator_types").eq("id",creditedId).maybeSingle();
  if(error||!person||!person.creator_types?.includes("Artist"))fail("Only a confirmed artist account can be linked as the primary performing artist.");
 }
 if(uploadedBy){
  const {data:person,error}=await admin.from("profiles").select("id").eq("id",uploadedBy).maybeSingle();
  if(error||!person)fail("Uploader account was not found.");
 }
 let projectId:string|null=null;
 if(kind==="demo"){
  const {data:track,error}=await admin.from("tracks").select("id,project_id").eq("id",id).maybeSingle();
  if(error||!track)fail("Project demo was not found.");
  projectId=track.project_id;
 }else{
  const {data:release,error}=await admin.from("music_releases").select("id").eq("id",id).maybeSingle();
  if(error||!release)fail("Release was not found.");
 }
 const key=kind==="demo"?"track_id":"release_id";
 const {data:existing,error:loadError}=await admin.from("music_catalogue_attributions").select("id,upload_origin,uploaded_by_profile_id,credited_artist_profile_id,credited_artist_name,credit_verified,credit_evidence_reference,ownership_kind,rights_holder_name,verification_state").eq(key,id).maybeSingle();
 if(loadError)fail("Catalogue attribution table is not available. Apply its database migration first.");
 const entry={
  release_id:kind==="release"?id:null,
  track_id:kind==="demo"?id:null,
  project_id:projectId,
  upload_origin:origin,
  uploaded_by_profile_id:uploadedBy||null,
  credited_artist_profile_id:creditedId||null,
  credited_artist_name:creditedName||null,
  credit_verified:creditVerified,
  credit_evidence_reference:creditEvidence||null,
  ownership_kind:ownership,
  rights_holder_name:rightsName||null,
  rights_evidence_reference:evidence||null,
  verification_state:state,
  attribution_note:note||null,
  updated_by:actor.id,
  updated_at:new Date().toISOString()
 };
 const response=existing
  ?await admin.from("music_catalogue_attributions").update(entry).eq("id",existing.id).select("id").single()
  :await admin.from("music_catalogue_attributions").insert({...entry,created_by:actor.id}).select("id").single();
 if(response.error||!response.data)fail("Could not save attribution. Review the selected song and try again.");
 await admin.from("platform_events").insert({user_id:actor.id,event_name:"music_attribution_reviewed",
  category:"music",entity_type:kind==="demo"?"track":"release",entity_id:id,
  metadata:{origin,previous:existing||null,current:{credited_artist_profile_id:creditedId||null,credited_artist_name:creditedName,
    credit_verified:creditVerified,ownership_kind:ownership,rights_holder_name:rightsName,verification_state:state},evidence:evidence||null}});
 revalidatePath(page);revalidatePath("/admin/releases");revalidatePath("/creators");
 redirect(page+"?saved="+encodeURIComponent(kind));
}
