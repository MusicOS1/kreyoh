"use client";

import { useState } from "react";
import { addBeat, prepareR2BeatUpload } from "../app/beats/actions";

export default function BeatUploadForm({ defaultCapacity }: { defaultCapacity: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setBusy(true); setError("");
    try {
      const file = formData.get("audio_file");
      if (file instanceof File && file.size > 0) {
        const prep = new FormData();
        prep.set("file_name", file.name); prep.set("file_type", file.type); prep.set("file_size", String(file.size));
        const signed = await prepareR2BeatUpload(prep);
        let response: Response;
        try {
          response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        } catch {
          throw new Error("The browser could not reach Cloudflare R2. Confirm the bucket CORS policy allows this site and localhost for PUT uploads.");
        }
        if (!response.ok) throw new Error(`Cloudflare rejected the audio transfer (${response.status}). Check the R2 bucket permissions and CORS policy.`);
        formData.delete("audio_file");
        formData.set("source_type", "r2");
        formData.set("storage_provider", "r2");
        formData.set("storage_key", signed.storageKey);
        formData.set("playback_url", signed.playbackUrl || "");
        formData.set("file_name", file.name);
        formData.set("file_size", String(file.size));
        formData.set("mime_type", file.type);
      }
      await addBeat(formData);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "The beat could not be uploaded.");
    }
  }

  return <form action={submit} className="panel beat-registration-form" encType="multipart/form-data">
    {error && <div className="form-error-alert wide" role="alert">{error}</div>}
    <label>Title *<input className="dark-input" name="title" required /></label><label>Producer credit<input className="dark-input" name="producer_name" /></label><label>Beat code<input className="dark-input" name="beat_code" placeholder="Generated if blank" /></label><label>Audio file<input className="dark-input" name="audio_file" type="file" accept="audio/*" /></label>
    <label>Source<select className="dark-select" name="source_type" defaultValue="r2"><option value="r2">Direct upload (Cloudflare R2)</option><option value="google_drive">Google Drive</option><option value="supabase">Supabase legacy</option><option value="nextbeat">NextBeat reference</option><option value="external">Other private link</option></select></label><label>External URL<input className="dark-input" type="url" name="external_url" /></label>
    <label>BPM<input className="dark-input" name="bpm" type="number" min="20" max="400" /></label><label>Key<input className="dark-input" name="musical_key" placeholder="A minor" /></label><label>Genre tags<input className="dark-input" name="genre_tags" placeholder="Afrobeats, hip-hop" /></label><label>Mood tags<input className="dark-input" name="mood_tags" placeholder="Warm, nocturnal" /></label><label>Artist slots<input className="dark-input" name="artist_capacity" type="number" min="1" max="12" defaultValue={defaultCapacity} /></label><label className="wide">Description<textarea className="dark-textarea" name="description" /></label><button className="submit-beat-btn" disabled={busy}>{busy ? "Uploading securely…" : "Upload to Beat Library"}</button>
  </form>;
}
