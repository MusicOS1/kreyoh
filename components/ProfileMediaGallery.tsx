"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { setProfileHeroImage, updateProfileMedia } from "../app/settings/actions";
import { createClient } from "../lib/client";

type Props = { userId: string; currentPhotos?: string[]; currentHero?: string | null };
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ProfileMediaGallery({ userId, currentPhotos = [], currentHero = null }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(currentPhotos.slice(0, MAX_PHOTOS));
  const [hero, setHero] = useState(currentHero || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const invalid = files.find((file) => !file.type.startsWith("image/") || file.size > MAX_FILE_SIZE);
      if (invalid) throw new Error("Use JPG, PNG or WebP images smaller than 10 MB each.");
      const supabase = createClient();
      const uploaded: string[] = [];
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("profile-media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);
        uploaded.push(supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl);
      }
      const next = [...photos, ...uploaded].slice(0, MAX_PHOTOS);
      const data = new FormData(); data.set("photos", JSON.stringify(next));
      await updateProfileMedia(data);
      setPhotos(next); setMessage("Photo catalogue updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The photos could not be uploaded.");
    } finally {
      setBusy(false); if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto(index: number) {
    const next = photos.filter((_, photoIndex) => photoIndex !== index);
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.set("photos", JSON.stringify(next));
      await updateProfileMedia(data); setPhotos(next); setMessage("Photo removed from the catalogue.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The photo could not be removed."); }
    finally { setBusy(false); }
  }

  async function chooseHero(photo: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = new FormData(); data.set("hero_image_url", photo);
      await setProfileHeroImage(data); setHero(photo); setMessage("Profile hero image updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The hero image could not be updated."); }
    finally { setBusy(false); }
  }

  return <section className="profile-media-uploader">
    <div className="profile-media-heading"><div><span className="settings-label">Best five photos</span><p>Build a curated press-ready catalogue, then choose any uploaded photo as your profile hero.</p></div><button type="button" className="secondary-button-inline" disabled={busy || photos.length >= MAX_PHOTOS} onClick={() => inputRef.current?.click()}>{busy ? "Uploading…" : "+ Add photos"}</button></div>
    <input ref={inputRef} hidden type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={choosePhotos} />
    <div className="profile-media-grid">{photos.map((photo, index) => <figure className={hero === photo ? "is-hero" : ""} key={photo}><img src={photo} alt={`Creator catalogue ${index + 1}`} /><div><button type="button" onClick={() => chooseHero(photo)} disabled={busy || hero === photo}>{hero === photo ? "Hero image" : "Use as hero"}</button><button type="button" onClick={() => removePhoto(index)} disabled={busy}>Remove</button></div></figure>)}{!photos.length && <p className="profile-media-empty">No catalogue photos yet.</p>}</div>
    {message && <p className="profile-photo-success">{message}</p>}{error && <p className="profile-photo-error">{error}</p>}
  </section>;
}
