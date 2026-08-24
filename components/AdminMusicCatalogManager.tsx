"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAdminMusicRecord,
  prepareAdminArtworkUpload,
  replaceAdminMusicCredits,
  saveAdminArtwork,
} from "../app/admin/(control)/actions";

type Member = { id: string; name: string; projectId: string };
type Credit = { id?: string; userId: string; role: string };
type MusicRecord = {
  id: string;
  type: "beat" | "track";
  projectId: string;
  projectName: string;
  title: string;
  code: string;
  status: string;
  artworkUrl?: string | null;
  credits: Credit[];
};

const roles = [
  ["artist", "Artist"],
  ["featured_artist", "Featured artist"],
  ["producer", "Producer"],
  ["co_producer", "Co-producer"],
  ["songwriter", "Songwriter"],
  ["composer", "Composer"],
  ["engineer", "Recording engineer"],
  ["mix_engineer", "Mix engineer"],
  ["mastering_engineer", "Mastering engineer"],
  ["vocalist", "Vocalist"],
  ["instrumentalist", "Instrumentalist"],
  ["a&r", "A&R"],
  ["manager", "Manager"],
  ["visual_creative", "Visual creative"],
  ["other", "Other contribution"],
];

const freshCredit = (): Credit => ({ id: crypto.randomUUID(), userId: "", role: "artist" });

function CatalogEditor({ record, members }: { record: MusicRecord; members: Member[] }) {
  const router = useRouter();
  const [credits, setCredits] = useState<Credit[]>(record.credits.length ? record.credits : [freshCredit()]);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const availableMembers = members.filter((member) => member.projectId === record.projectId);

  async function uploadArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy("artwork"); setError(""); setNotice("");
    try {
      const file = formData.get("artwork_file");
      if (!(file instanceof File) || !file.size) throw new Error("Choose a thumbnail first.");
      const prep = new FormData();
      prep.set("entity_type", record.type); prep.set("entity_id", record.id);
      prep.set("file_name", file.name); prep.set("file_type", file.type); prep.set("file_size", String(file.size));
      const signed = await prepareAdminArtworkUpload(prep);
      let response: Response;
      try { response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }); }
      catch { throw new Error("The browser could not reach Cloudflare R2."); }
      if (!response.ok) throw new Error(`Cloudflare rejected the image (${response.status}).`);
      const save = new FormData(); save.set("entity_type", record.type); save.set("entity_id", record.id); save.set("storage_key", signed.storageKey);
      const result = await saveAdminArtwork(save);
      setNotice(result.message); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Thumbnail upload failed."); }
    finally { setBusy(""); }
  }

  async function saveCredits() {
    setBusy("credits"); setError(""); setNotice("");
    try {
      const data = new FormData(); data.set("entity_type", record.type); data.set("entity_id", record.id);
      credits.filter((credit) => credit.userId).forEach((credit) => { data.append("credit_user_id", credit.userId); data.append("credit_role", credit.role); });
      const result = await replaceAdminMusicCredits(data); setNotice(result.message); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Credits could not be saved."); }
    finally { setBusy(""); }
  }

  async function removeRecord() {
    if (!window.confirm(`Delete ${record.title}? This cannot be undone.`)) return;
    setBusy("delete"); setError(""); setNotice("");
    try {
      const data = new FormData(); data.set("entity_type", record.type); data.set("entity_id", record.id); data.set("confirmation", "DELETE");
      await deleteAdminMusicRecord(data); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The record could not be deleted."); setBusy(""); }
  }

  return <details className="control-catalog-card">
    <summary>
      <span className="control-catalog-thumb">{record.artworkUrl ? <img src={record.artworkUrl} alt="" /> : record.type === "beat" ? "B" : "T"}</span>
      <div><small>{record.code} · {record.projectName}</small><strong>{record.title}</strong></div>
      <span className="control-status">{record.status.replaceAll("_", " ")}</span>
      <b>Manage +</b>
    </summary>
    <div className="control-catalog-body">
      <form onSubmit={uploadArtwork} className="control-artwork-form">
        <label>Thumbnail / cover image<input name="artwork_file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
        <button disabled={Boolean(busy)}>{busy === "artwork" ? "Uploading…" : "Update thumbnail"}</button>
      </form>
      <section className="control-credit-editor">
        <header><div><span className="control-eyebrow">CREDITS</span><h3>People on this {record.type}</h3></div><button type="button" onClick={() => setCredits((current) => [...current, freshCredit()])}>+ Add credit</button></header>
        <div>{credits.map((credit, index) => <div className="control-credit-row" key={credit.id || index}>
          <select value={credit.userId} onChange={(event) => setCredits((current) => current.map((item, i) => i === index ? { ...item, userId: event.target.value } : item))}><option value="">Choose member</option>{availableMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
          <select value={credit.role} onChange={(event) => setCredits((current) => current.map((item, i) => i === index ? { ...item, role: event.target.value } : item))}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={() => setCredits((current) => current.filter((_, i) => i !== index))}>Remove</button>
        </div>)}</div>
        <button type="button" onClick={saveCredits} disabled={Boolean(busy)}>{busy === "credits" ? "Saving…" : "Save credits"}</button>
      </section>
      {notice && <p className="control-catalog-notice success">{notice}</p>}{error && <p className="control-catalog-notice error">{error}</p>}
      <button type="button" className="control-catalog-delete" onClick={removeRecord} disabled={Boolean(busy)}>{busy === "delete" ? "Deleting…" : `Delete ${record.type}`}</button>
    </div>
  </details>;
}

export default function AdminMusicCatalogManager({ records, members }: { records: MusicRecord[]; members: Member[] }) {
  const beats = records.filter((record) => record.type === "beat");
  const tracks = records.filter((record) => record.type === "track");
  return <section className="control-catalog-manager">
    <header><div><span className="control-eyebrow">ADMIN ONLY</span><h2>Music catalogue controls</h2><p>Update covers and official credits, or permanently remove a record.</p></div></header>
    <div className="control-catalog-columns">
      <div><h3>Beats <span>{beats.length}</span></h3>{beats.map((record) => <CatalogEditor key={record.id} record={record} members={members} />)}</div>
      <div><h3>Tracks <span>{tracks.length}</span></h3>{tracks.map((record) => <CatalogEditor key={record.id} record={record} members={members} />)}</div>
    </div>
  </section>;
}
