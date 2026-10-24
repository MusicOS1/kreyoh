"use server";
import {revalidatePath} from "next/cache";
import {getWorkspace} from "../../lib/workspace";
import {canApplicantEdit,parseApplicationFields} from "../../lib/professionalApplications";
const read=(fd:FormData,key:string)=>String(fd.get(key)||"").trim();

export async function saveProfessionalApplication(
  _previous:{error:string;success:string},fd:FormData,
):Promise<{error:string;success:string}>{
  // Authentication failures must never be hidden by form-level error handling.
  const {user,admin}=await getWorkspace();
  try{
    const fields=parseApplicationFields({
      profession:read(fd,"profession"),displayName:read(fd,"display_name"),
      bio:read(fd,"bio"),skills:read(fd,"skills"),
      portfolio:read(fd,"portfolio_url"),experienceYears:read(fd,"experience_years"),
    });
    const intent=read(fd,"intent");
    if(!["save","submit"].includes(intent))throw new Error("Choose Save draft or Submit.");
    if(intent==="submit"&&fields.bio.length<30)
      throw new Error("Write at least 30 characters about your work before submitting.");
    const {data:existing,error:fetchError}=await admin.from("professional_applications")
      .select("id,status").eq("user_id",user.id).eq("profession",fields.profession).maybeSingle();
    if(fetchError)throw new Error("Professional applications are temporarily unavailable. Please try again.");
    if(!canApplicantEdit(existing?.status))
      throw new Error("This application is already being reviewed or has a final decision.");
    const now=new Date().toISOString();
    const payload={...fields,user_id:user.id,
      status:intent==="submit"?"submitted":"draft",
      submitted_at:intent==="submit"?now:null,
      reviewed_by:null,reviewed_at:null,review_note:null,updated_at:now};
    if(existing){
      const {data,error}=await admin.from("professional_applications")
        .update(payload).eq("id",existing.id).eq("user_id",user.id)
        .eq("status",existing.status).select("id").maybeSingle();
      if(error||!data)throw new Error("Application changed while saving. Refresh and try again.");
    }else{
      const {error}=await admin.from("professional_applications").insert(payload);
      if(error)throw new Error("Could not create this application. Check whether one already exists for this profession.");
    }
    revalidatePath("/professional-onboarding");
    revalidatePath("/admin/professional-applications");
    return {error:"",success:intent==="submit"?"Application submitted for review.":"Draft saved."};
  }catch(error){
    return {error:error instanceof Error?error.message:"Unable to save your application.",success:""};
  }
}
