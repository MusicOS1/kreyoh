import { getWorkspace } from "../../../../../lib/workspace";
import { createR2PresignedUrl } from "../../../../../lib/r2";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { admin, project, membership } = await getWorkspace();
  const headers = { "Cache-Control": "private, no-store" };
  if (!project || !membership) return new Response("Project access required.", { status: 403, headers });
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(assetId)) {
    return new Response("File not found.", { status: 404, headers });
  }

  const { data: asset, error } = await admin.from("project_assets")
    .select("entity_id,bucket_id,storage_path,file_name")
    .eq("id", assetId).eq("project_id", project.id).eq("entity_type", "track").maybeSingle();
  if (error) return new Response("Unable to load this file. Please try again.", { status: 503, headers });
  if (!asset?.storage_path) return new Response("File not found.", { status: 404, headers });

  try {
    let url: string;
    if (asset.bucket_id === "r2") {
      if (!asset.storage_path.startsWith(`${project.id}/tracks/${asset.entity_id}/`)) {
        return new Response("File not found.", { status: 404, headers });
      }
      url = await createR2PresignedUrl("GET", asset.storage_path, 900, undefined, asset.file_name || "track-file");
    } else {
      const { data, error: storageError } = await admin.storage.from(asset.bucket_id)
        .createSignedUrl(asset.storage_path, 900, { download: asset.file_name || true });
      if (storageError || !data?.signedUrl) throw new Error("File unavailable");
      url = data.signedUrl;
    }
    return new Response(null, { status: 303, headers: { ...headers, Location: url } });
  } catch {
    return new Response("Download unavailable. Please return to the track and try again.", { status: 503, headers });
  }
}
