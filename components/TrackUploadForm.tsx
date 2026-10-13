"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { prepareTrackUploadResult, saveTrackAssetResult } from "../app/tracks/actions";

import { trackUploadError } from "../lib/trackUploadPolicy";
import { directUpload } from "../lib/directUpload";

export default function TrackUploadForm({ trackId }: { trackId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const uploaded = useRef<{file: File; key: string} | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
      const validation = trackUploadError(file.name, file.type || "application/octet-stream", file.size);
      if (validation) throw new Error(validation);
      const cached = uploaded.current;
      const sameFile = cached && cached.file.name === file.name && cached.file.size === file.size && cached.file.lastModified === file.lastModified;
      let storageKey = sameFile ? cached.key : "";
      if (!storageKey) {
        setMessage("Preparing secure upload…");
        const prepared = await prepareTrackUploadResult(prep);
        if (!prepared.ok) throw new Error(prepared.error);
        setMessage("Transferring file directly to storage…");
        setProgress(0);
        await directUpload(prepared.value.uploadUrl, file, file.type || "application/octet-stream", setProgress);
        storageKey = prepared.value.storageKey;
        uploaded.current = { file, key: storageKey };
      }
      setMessage("Transfer complete. Saving file to the track…");

      formData.delete("track_file");
      formData.set("track_id", trackId);
      formData.set("storage_key", storageKey);
      formData.set("file_name", file.name);
      formData.set("mime_type", file.type || "application/octet-stream");
      const result = await saveTrackAssetResult(formData);
      if (!result.ok) throw new Error(result.error);
      uploaded.current = null;

      formRef.current?.reset();
      setMessage(result.value.message);
      setBusy(false);
      router.refresh();
    } catch (cause) {
      setBusy(false);
      setMessage("");
      setError(cause instanceof Error ? cause.message : "The track file could not be uploaded.");
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="track-upload-form">
      <div className="track-upload-intro"><strong>Add a new version</strong><span>Audio up to 250 MB; stems ZIP up to 4 GB per file. Keep this tab open. The newest upload appears first. Earlier versions stay safely in the project history.</span></div>
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
        <label className="track-version-note-field">
          Version note
          <input name="version_note" maxLength={280} placeholder="What changed in this version?" />
        </label>
        <button disabled={busy}>{busy ? "Uploading securely…" : "Add track file"}</button>
      </div>
      {busy && <progress value={progress} max={100} aria-label="File upload progress" />}
      {error && <div className="form-error-alert" role="alert">{error}</div>}
      {message && <div className="form-success-alert" role="status">{message}</div>}
    </form>
  );
}
