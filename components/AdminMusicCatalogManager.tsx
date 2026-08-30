"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/client";
import {
  deleteAdminMusicRecord,
  prepareAdminArtworkUpload,
  replaceAdminMusicCredits,
  saveAdminArtwork,
  updateAdminMusicMetadata,
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
  metadata: Record<string, any>;
  beatOptions?: Array<{ id: string; label: string }>;
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
      const { error: uploadError } = await createClient().storage
        .from("music-images")
        .uploadToSignedUrl(signed.storageKey, signed.token, file, { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);
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

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("metadata"); setError(""); setNotice("");
    try { const data=new FormData(event.currentTarget); data.set("entity_type",record.type);data.set("entity_id",record.id);const result=await updateAdminMusicMetadata(data);setNotice(result.message);router.refresh(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Metadata could not be saved.");}
    finally{setBusy("");}
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
      <form onSubmit={saveMetadata} className="control-catalog-metadata">
        <header><div><span className="control-eyebrow">METADATA</span><h3>Edit the full record</h3></div></header>
        <input name="title" defaultValue={record.title} placeholder={record.type==="beat"?"Beat title":"Working title"}/><input name="code" defaultValue={record.code} placeholder="Code"/>
        {record.type==="beat"?<><input name="producer_name" defaultValue={record.metadata.producer_name||""} placeholder="Producer credit"/><input name="bpm" type="number" min="20" max="400" defaultValue={record.metadata.bpm||""} placeholder="BPM"/><input name="musical_key" defaultValue={record.metadata.musical_key||""} placeholder="Key"/><input name="genre_tags" defaultValue={(record.metadata.genre_tags||[]).join(", ")} placeholder="Genres, comma separated"/><input name="mood_tags" defaultValue={(record.metadata.mood_tags||[]).join(", ")} placeholder="Moods, comma separated"/><input name="artist_capacity" type="number" min="1" max="12" defaultValue={record.metadata.artist_capacity||3}/><select name="source_type" defaultValue={record.metadata.source_type||"manual"}><option>manual</option><option>r2</option><option>google_drive</option><option>dropbox</option><option>nextbeat</option><option>external</option></select><input name="external_url" type="url" defaultValue={record.metadata.external_url||""} placeholder="External source URL"/><textarea name="description" defaultValue={record.metadata.description||""} placeholder="Beat description"/></>:<select name="beat_id" defaultValue={record.metadata.beat_id||""}><option value="">Original track / no beat</option>{(record.beatOptions||[]).map(beat=><option key={beat.id} value={beat.id}>{beat.label}</option>)}</select>}
        <select name="status" defaultValue={record.status}>{record.type==="beat"?["available","filling","full","in_development","in_studio","locked","completed","archived"].map(item=><option key={item}>{item}</option>):["in_development","revision","in_studio","mixing","mastering","release_ready","complete"].map(item=><option key={item}>{item}</option>)}</select><button disabled={Boolean(busy)}>{busy==="metadata"?"Saving…":"Save metadata"}</button>
      </form>
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

export default function AdminMusicCatalogManager({ records, members, beatTotal, trackTotal, beatPage, trackPage, pageSize, query = "" }: { records: MusicRecord[]; members: Member[]; beatTotal: number; trackTotal: number; beatPage: number; trackPage: number; pageSize: number; query?: string }) {
  const beats = records.filter((record) => record.type === "beat");
  const tracks = records.filter((record) => record.type === "track");
  const beatPages = Math.max(1, Math.ceil(beatTotal / pageSize));
  const trackPages = Math.max(1, Math.ceil(trackTotal / pageSize));
  const pageHref = (nextBeat: number, nextTrack: number) => { const params = new URLSearchParams({ beatPage: String(nextBeat), trackPage: String(nextTrack) }); if (query) params.set("q", query); return `/admin/operations?${params.toString()}`; };
  return <section className="control-catalog-manager">
    <header><div><span className="control-eyebrow">ADMIN ONLY</span><h2>Music catalogue controls</h2><p>Update covers and official credits, or permanently remove a record. Catalogues are paginated in sets of 15.</p></div></header>
    <div className="control-catalog-columns">
      <div><h3>Beats <span>{beatTotal} total</span></h3>{beats.map((record) => <CatalogEditor key={record.id} record={record} members={members} />)}<nav className="control-catalog-pagination" aria-label="Beat pages"><a aria-disabled={beatPage <= 1} href={pageHref(Math.max(1, beatPage - 1), trackPage)}>Previous</a><span>Page {beatPage} of {beatPages}</span><a aria-disabled={beatPage >= beatPages} href={pageHref(Math.min(beatPages, beatPage + 1), trackPage)}>Next</a></nav></div>
      <div><h3>Tracks <span>{trackTotal} total</span></h3>{tracks.map((record) => <CatalogEditor key={record.id} record={record} members={members} />)}<nav className="control-catalog-pagination" aria-label="Track pages"><a aria-disabled={trackPage <= 1} href={pageHref(beatPage, Math.max(1, trackPage - 1))}>Previous</a><span>Page {trackPage} of {trackPages}</span><a aria-disabled={trackPage >= trackPages} href={pageHref(beatPage, Math.min(trackPages, trackPage + 1))}>Next</a></nav></div>
    </div>
  </section>;
}