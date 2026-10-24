"use server";
import {revalidatePath} from "next/cache";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {canReview,validDecision} from "../../../../lib/professionalApplications";
const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();
export async function reviewProfessionalApplication(
  _previous:{error:string;success:string},fd:FormData,
):Promise<{error:string;success:string}>{
  const reviewer=await requireControlRoomPermission("people");
  try{
    const id=read(fd,"application_id"),status=read(fd,"status"),note=read(fd,"review_note");
    if(!validDecision(status))throw new Error("Invalid review decision.");
    if(note.length>1000)throw new Error("Feedback must be under 1,000 characters.");
    if(["rejected","changes_requested"].includes(status)&&note.length<10)
      throw new Error("Explain why this application needs changes or was rejected.");
    const admin=createAdminClient();
    const {data:app,error:readError}=await admin.from("professional_applications")
      .select("id,user_id,profession,status").eq("id",id).maybeSingle();
    if(readError||!app)throw new Error("Application not found.");
    if(app.user_id===reviewer.id)throw new Error("You cannot review your own application.");
    if(!canReview(app.status,status))throw new Error("This application is not awaiting that decision.");
    const now=new Date().toISOString();
    const {data:updated,error}=await admin.from("professional_applications")
      .update({status,review_note:note||null,reviewed_by:reviewer.id,reviewed_at:now,updated_at:now})
      .eq("id",id).eq("status",app.status).select("id").maybeSingle();
    if(error||!updated)throw new Error("Application changed before saving. Refresh and try again.");
    // The database trigger records the status transition in the same transaction.
    const {error:noticeError}=await admin.from("notifications").insert({
      user_id:app.user_id,project_id:null,type:"professional_application_review",
      title:"Professional application: "+status.replaceAll("_"," "),
      body:note||"Your "+app.profession+" professional application was updated.",
      entity_type:"professional_application",entity_id:id,
      action_url:"/professional-onboarding?profession="+encodeURIComponent(app.profession),
      importance:"normal",
    });
    if(noticeError)console.warn("Professional application notification unavailable",noticeError.code);
    revalidatePath("/admin/professional-applications");
    revalidatePath("/professional-onboarding");
    return {error:"",success:"Review decision saved."};
  }catch(error){
    return {error:error instanceof Error?error.message:"Could not save the decision.",success:""};
  }
}
