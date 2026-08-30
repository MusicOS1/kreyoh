"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const read = (data: FormData, key: string) => String(data.get(key) || "").trim();
const commercialRoles = ["Super Admin", "Admin", "Project Lead", "A&R", "Manager"];

async function requireCommercialAccess() {
  const context = await getWorkspace();
  if (!context.project || !context.membership || !hasAnyRole(context.roles, commercialRoles)) {
    throw new Error("Commercial management access is required.");
  }
  return context;
}

export async function createOpportunity(data: FormData) {
  const { admin, user, project } = await requireCommercialAccess();
  const opportunityType = read(data, "opportunity_type");
  const revenuePathway = read(data, "revenue_pathway");
  if (!opportunityType || !revenuePathway) throw new Error("Choose an opportunity type and revenue pathway.");
  const value = read(data, "estimated_value");
  const { data: opportunity, error } = await admin.from("commercial_opportunities").insert({
    project_id: project!.id,
    track_id: read(data, "track_id") || null,
    opportunity_type: opportunityType,
    organisation: read(data, "organisation") || null,
    contact_person: read(data, "contact_person") || null,
    revenue_pathway: revenuePathway,
    assigned_owner: read(data, "assigned_owner") || null,
    estimated_value: value ? Number(value) : null,
    currency: read(data, "currency") || "KES",
    status: "identified",
    next_action: read(data, "next_action") || null,
    follow_up_date: read(data, "follow_up_date") || null,
    notes: read(data, "notes") || null,
    created_by: user.id,
  }).select("id,assigned_owner").single();
  if (error) throw new Error(error.message);
  if (opportunity.assigned_owner && opportunity.assigned_owner !== user.id) {
    await admin.from("notifications").insert({
      user_id: opportunity.assigned_owner, project_id: project!.id, type: "commercial_opportunity_assigned",
      title: "Commercial opportunity assigned", body: opportunityType, entity_type: "opportunity", entity_id: opportunity.id,
    });
  }
  await admin.from("activity_log").insert({ project_id: project!.id, user_id: user.id, action: `created a ${opportunityType} opportunity`, entity_type: "opportunity", entity_id: opportunity.id });
  revalidatePath("/opportunities"); revalidatePath("/home");
}

export async function updateOpportunity(data: FormData) {
  const { admin, user, project } = await requireCommercialAccess();
  const opportunityId = read(data, "opportunity_id");
  const { error } = await admin.from("commercial_opportunities").update({
    status: read(data, "status"), next_action: read(data, "next_action") || null,
    follow_up_date: read(data, "follow_up_date") || null, negotiated_value: read(data, "negotiated_value") ? Number(read(data, "negotiated_value")) : null,
    contracted_value: read(data, "contracted_value") ? Number(read(data, "contracted_value")) : null,
    notes: read(data, "notes") || null, updated_at: new Date().toISOString(),
  }).eq("id", opportunityId).eq("project_id", project!.id);
  if (error) throw new Error(error.message);
  await admin.from("activity_log").insert({ project_id: project!.id, user_id: user.id, action: `updated a commercial opportunity to ${read(data, "status")}`, entity_type: "opportunity", entity_id: opportunityId });
  revalidatePath("/opportunities");
}

export async function createCreatorCampaign(data: FormData) {
  const { admin, user, project } = await requireCommercialAccess();
  const name = read(data, "campaign_name");
  if (!name) throw new Error("Give the campaign a name.");
  const { error } = await admin.from("creator_campaigns").insert({
    project_id: project!.id, track_id: read(data, "track_id") || null, campaign_name: name,
    objective: read(data, "objective") || null, start_date: read(data, "start_date") || null,
    end_date: read(data, "end_date") || null, budget: read(data, "budget") ? Number(read(data, "budget")) : null,
    currency: read(data, "currency") || "KES", campaign_owner: read(data, "campaign_owner") || user.id, created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/opportunities");
}
