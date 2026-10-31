"use server";
import {revalidatePath} from "next/cache";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
export async function bulkApprovePending(_prior:{message:string;ok:boolean},fd:FormData){
 try{
  const reviewer=await requireControlRoomPermission("music");
  if(fd.get("confirmation")!=="approve")throw Error("Please confirm approval of the selected releases.");
  const admin=createAdminClient();
  const{data:pending,error}=await admin.from("music_releases")
    .select("*").eq("status","pending").not("rights_confirmed_at","is",null)
    .order("submitted_at",{ascending:true}).limit(100);
  if(error)throw Error("Could not load pending releases.");
  if(!pending?.length)return{message:"No verified releases are pending approval.",ok:true,approvedCount:0};
  const ids=pending.filter(release=>!release.source_track_id).map(release=>release.id);
  if(!ids.length)return{message:"Linked releases require individual version review.",ok:true,approvedCount:0};
  const{data:approved,error:updateError}=await admin.from("music_releases").update({
    status:"published",reviewed_by:reviewer.id,reviewed_at:new Date().toISOString(),review_note:"Bulk approval by Music Control Room"
  }).in("id",ids).eq("status","pending").not("rights_confirmed_at","is",null).select("id");
  if(updateError)throw Error("Bulk approval failed. Refresh and retry.");
  for(const path of ["/admin/releases","/billboard","/fan","/listen"])revalidatePath(path);
  return{message:(approved?.length||0)+" releases approved. Scheduled tracks will appear on their release dates.",ok:true,approvedCount:approved?.length||0};
 }catch(error){return{message:error instanceof Error?error.message:"Could not approve releases.",ok:false};}
}
