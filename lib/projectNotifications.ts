export async function notifyUser(
  admin: any,
  input: {
    userId: string;
    projectId?: string | null;
    type: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  },
) {
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    project_id: input.projectId || null,
    type: input.type,
    title: input.title,
    body: input.body || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
  });
  if (error) throw new Error(error.message);
}

export async function notifyProjectMembers(
  admin: any,
  input: {
    projectId: string;
    type: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    excludeUserId?: string | null;
  },
) {
  const { data: members, error } = await admin
    .from("project_members")
    .select("user_id")
    .eq("project_id", input.projectId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const rows = (members || [])
    .filter((member: any) => member.user_id && member.user_id !== input.excludeUserId)
    .map((member: any) => ({
      user_id: member.user_id,
      project_id: input.projectId,
      type: input.type,
      title: input.title,
      body: input.body || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
    }));

  if (!rows.length) return;
  const { error: insertError } = await admin.from("notifications").insert(rows);
  if (insertError) throw new Error(insertError.message);
}
