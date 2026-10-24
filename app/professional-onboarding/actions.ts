"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace } from "../../lib/workspace";
import { canApplicantEdit, parseApplicationFields } from "../../lib/professionalApplications";

const value = (fd: FormData, key: string) => String(fd.get(key) || "").trim();

export async function saveProfessionalApplication(fd: FormData) {
  const { user, admin } = await getWorkspace();
  const fields = parseApplicationFields({
    profession: value(fd,"profession"), displayName: value(fd,"display_name"),
    bio: value(fd,"bio"), skills: value(fd,"skills"),
    portfolio: value(fd,"portfolio_url"), experienceYears: value(fd,"experience_years"),
  });
  const intent = value(fd, "intent");
  if (!["save","submit"].includes(intent)) throw new Error("Choose Save draft or Submit.");
  if (intent === "submit" && fields.bio.length < 30) {
    throw new Error("Add at least 30 characters about your work before submitting.");
  }
  const { data: existing, error: fetchError } = await admin.from("professional_applications")
    .select("id,status").eq("user_id", user.id).eq("profession", fields.profession).maybeSingle();
  if (fetchError) throw new Error("Professional applications are unavailable in this environment. Ask an administrator to configure the staging schema.");
  if (!canApplicantEdit(existing?.status)) throw new Error("This application is with the review team or already decided.");
  const timestamp = new Date().toISOString();
  const payload = {
    ...fields, user_id:user.id, status:intent === "submit" ? "submitted" : "draft",
    submitted_at:intent === "submit" ? timestamp : null,
    reviewed_by:null,reviewed_at:null,review_note:null,updated_at:timestamp,
  };
  if (existing) {
    const {data, error} = await admin.from("professional_applications")
      .update(payload).eq("id",existing.id).eq("user_id",user.id)
      .eq("status",existing.status).select("id").maybeSingle();
    if (error || !data) throw new Error("Application changed while saving. Refresh and retry.");
  } else {
    const {error}=await admin.from("professional_applications").insert(payload);
    if(error) throw new Error("Could not save this application. You may already have an application for this profession.");
  }
  revalidatePath("/professional-onboarding");
  revalidatePath("/admin/professional-applications");
}
