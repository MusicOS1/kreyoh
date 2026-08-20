"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { updateProfilePhoto } from "../app/settings/actions";
import { createClient } from "../lib/client";
import { ArrowUpRight, CheckCircleIcon } from "./Icons";

type ProfilePhotoUploadProps = {
  userId: string;
  currentAvatarUrl?: string | null;
  fallbackText: string;
};

const BUCKET = "profile-avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ProfilePhotoUpload({
  userId,
  currentAvatarUrl,
  fallbackText,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(currentAvatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file && currentAvatarUrl) setPreview(currentAvatarUrl);
  }, [currentAvatarUrl, file]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setError("");
    setMessage("");

    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("Profile photos must be smaller than 5 MB.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSave = async () => {
    if (!file) {
      setError("Choose a new photo first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const uniqueName = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${userId}/profile-${uniqueName}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const formData = new FormData();
      formData.set("avatar_url", data.publicUrl);
      await updateProfilePhoto(formData);

      setFile(null);
      setMessage("Profile photo saved.");
      setPreview(data.publicUrl);
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Photo upload failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-photo-uploader">
      <div className="profile-photo-preview">
        {preview ? <img src={preview} alt="Profile preview" /> : <span>{fallbackText}</span>}
      </div>
      <div className="profile-photo-copy">
        <span className="settings-label">Profile photo</span>
        <p>Use a clear image so the project can recognize you across the room.</p>
        <div className="profile-photo-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="profile-photo-input"
            aria-label="Choose profile photo"
          />
          <button type="button" className="secondary-button-inline profile-photo-choose" onClick={() => inputRef.current?.click()}>
            <ArrowUpRight size={13} /> {file ? "Choose another" : "Upload photo"}
          </button>
          <button type="button" className="submit-beat-btn profile-photo-save" onClick={handleSave} disabled={!file || saving}>
            {saving ? "Saving…" : "Save photo"}
          </button>
        </div>
        {message && <span className="profile-photo-success"><CheckCircleIcon size={13} /> {message}</span>}
        {error && <span className="profile-photo-error">{error}</span>}
        <span className="settings-readonly-note">PNG, JPG, or WebP · 5 MB maximum</span>
      </div>
    </div>
  );
}
