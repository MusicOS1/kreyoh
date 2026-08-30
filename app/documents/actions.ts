"use server";

import { revalidatePath } from "next/cache";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";

const DOCUMENT_TYPES = new Set([
  "meeting_minutes",
  "brief",
  "agreement",
  "report",
  "reference",
  "other",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function cleanFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "document";
}

export async function createProjectDocument(formData: FormData) {
  const { admin, user, project } = await getWorkspace();

  if (!project) {
    throw new Error("Choose an active project before adding project records.");
  }

  const title = read(formData, "title");
  const documentType = read(formData, "document_type");
  const meetingDate = read(formData, "meeting_date") || null;
  const summary = read(formData, "summary") || null;
  const decisions = read(formData, "decisions") || null;
  const actionItems = read(formData, "action_items") || null;
  const externalUrl = read(formData, "external_url") || null;
  const attendees = read(formData, "attendees")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!title) {
    throw new Error("Document title is required.");
  }

  if (!DOCUMENT_TYPES.has(documentType)) {
    throw new Error("Choose a valid document type.");
  }

  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
    throw new Error("External document links must start with http:// or https://.");
  }

  let fileStorageKey: string | null = null;
  let fileName: string | null = null;
  let fileMimeType: string | null = null;
  let fileSize: number | null = null;

  const upload = formData.get("file");

  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 25 * 1024 * 1024) {
      throw new Error("Project documents are limited to 25 MB per file.");
    }

    const safeName = cleanFileName(upload.name);
    fileStorageKey = `${project.id}/${crypto.randomUUID()}/${safeName}`;
    fileName = upload.name;
    fileMimeType = upload.type || "application/octet-stream";
    fileSize = upload.size;

    const { error: uploadError } = await admin.storage
      .from("project-documents")
      .upload(fileStorageKey, upload, {
        contentType: fileMimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  }

  const { error } = await admin.from("project_documents").insert({
    project_id: project.id,
    title,
    document_type: documentType,
    meeting_date: documentType === "meeting_minutes" ? meetingDate : null,
    attendees: documentType === "meeting_minutes" ? attendees : [],
    summary,
    decisions: documentType === "meeting_minutes" ? decisions : null,
    action_items: documentType === "meeting_minutes" ? actionItems : null,
    file_storage_key: fileStorageKey,
    file_name: fileName,
    file_mime_type: fileMimeType,
    file_size: fileSize,
    external_url: externalUrl,
    created_by: user.id,
  });

  if (error) {
    if (fileStorageKey) {
      await admin.storage.from("project-documents").remove([fileStorageKey]);
    }
    throw new Error(error.message);
  }

  revalidatePath("/documents");
}

export async function deleteProjectDocument(formData: FormData) {
  const { admin, user, project, roles } = await getWorkspace();

  if (!project) {
    throw new Error("No active project.");
  }

  const id = read(formData, "document_id");
  if (!id) {
    throw new Error("Document not found.");
  }

  const { data: document, error: readError } = await admin
    .from("project_documents")
    .select("id,created_by,file_storage_key")
    .eq("id", id)
    .eq("project_id", project.id)
    .maybeSingle();

  if (readError || !document) {
    throw new Error(readError?.message || "Document not found.");
  }

  const canDelete =
    document.created_by === user.id ||
    hasAnyRole(roles, ["Super Admin", "Admin", "Project Lead"]);

  if (!canDelete) {
    throw new Error("Only the document creator or project management can remove this record.");
  }

  if (document.file_storage_key) {
    await admin.storage
      .from("project-documents")
      .remove([document.file_storage_key]);
  }

  const { error } = await admin
    .from("project_documents")
    .delete()
    .eq("id", document.id)
    .eq("project_id", project.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/documents");
}
