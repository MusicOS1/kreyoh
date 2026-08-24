"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { prepareTrackUpload, saveTrackAsset } from "../app/tracks/actions";

export default function TrackUploadForm({ trackId }: { trackId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const file = formData.get("track_file");
      if (!(file instanceof File) || file.size <= 0) {
        throw new Error("Choose a track file first.");
      }

      const prep = new FormData();
      prep.set("track_id", trackId);
      prep.set("asset_kind", String(formData.get("asset_kind") || "demo"));
      prep.set("file_name", file.name);
      prep.set("file_type", file.type || "application/octet-stream");
      prep.set("file_size", String(file.size));
      const signed = await prepareTrackUpload(prep);

      let response: Response;
      try {
        response = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
      } catch {
        throw new Error("The browser could not reach Cloudflare R2. Check the bucket CORS origins and try again.");
      }

      if (!response.ok) {
        throw new Error(`Cloudflare rejected the track transfer (${response.status}).`);
      }

      formData.delete("track_file");
      formData.set("track_id", trackId);
      formData.set("storage_key", signed.storageKey);
      formData.set("file_name", file.name);
      formData.set("mime_type", file.type || "application/octet-stream");
      const result = await saveTrackAsset(formData);

      formRef.current?.reset();
      setMessage(result.message);
      setBusy(false);
      router.refresh();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "The track file could not be uploaded.");
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="track-upload-form">
      <div className="track-upload-fields">
        <label>
          File type
          <select name="asset_kind" defaultValue="demo">
            <option value="demo">Demo</option>
            <option value="rough_mix">Rough mix</option>
            <option value="mix">Mix</option>
            <option value="master">Master</option>
            <option value="stems">Stems (ZIP)</option>
            <option value="reference">Reference</option>
          </select>
        </label>
        <label>
          Audio or stems
          <input name="track_file" type="file" accept="audio/*,.zip,application/zip" required />
        </label>
        <button disabled={busy}>{busy ? "Uploading securely…" : "Add track file"}</button>
      </div>
      {error && <div className="form-error-alert" role="alert">{error}</div>}
      {message && <div className="form-success-alert" role="status">{message}</div>}
    </form>
  );
}
