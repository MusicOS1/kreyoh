"use client";

import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {prepareTrackReplacement,finalizeTrackReplacement,saveReusableTrackAsset} from "../app/tracks/reuseActions";

type BeatOption={id:string;title:string|null;beat_code:string|null;producer_name:string|null;};

export default function TrackReplacementForm({
  trackId,
  currentTitle,
  currentBeatId,
  beats,
}:{
  trackId:string;
  currentTitle:string;
  currentBeatId:string|null;
  beats:BeatOption[];
}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const fd=new FormData(event.currentTarget);
    const file=fd.get("track_file");
    if(!(file instanceof File)||file.size<=0){setError("Choose the replacement audio.");return;}
    setBusy(true);setError("");setMessage("");
    try{
      const prep=new FormData();
      prep.set("track_id",trackId);
      prep.set("working_title",String(fd.get("working_title")||""));
      prep.set("beat_id",String(fd.get("beat_id")||""));
      prep.set("file_name",file.name);
      prep.set("file_type",file.type||"application/octet-stream");
      prep.set("file_size",String(file.size));

      const signed=await prepareTrackReplacement(prep);

      const response=await fetch(signed.uploadUrl,{
        method:"PUT",
        headers:{"Content-Type":file.type||"application/octet-stream"},
        body:file,
      });
      if(!response.ok)throw new Error(`Cloudflare rejected the replacement transfer (${response.status}).`);

      const asset=new FormData();
      asset.set("track_id",trackId);
      asset.set("storage_key",signed.storageKey);
      asset.set("file_name",file.name);
      asset.set("mime_type",file.type||"application/octet-stream");
      asset.set("asset_kind","demo");
      asset.set("version_note",`Replacement audio. Previous working title: ${signed.previousTitle}. ${String(fd.get("version_note")||"")}`.trim());
      await saveReusableTrackAsset(asset);

      const finish=new FormData();
      finish.set("track_id",trackId);
      finish.set("working_title",signed.workingTitle);
      finish.set("beat_id",signed.beatId||"");
      finish.set("previous_title",signed.previousTitle);
      const result=await finalizeTrackReplacement(finish);

      setMessage(result.message);
      setBusy(false);
      router.push("/tracks");
      router.refresh();
    }catch(cause){
      setBusy(false);
      setError(cause instanceof Error?cause.message:"Track replacement failed.");
    }
  }

  return <form onSubmit={submit} className="panel track-intake-form">
    <div className="track-intake-grid">
      <label>Replacement title *
        <input name="working_title" defaultValue={currentTitle} required/>
      </label>
      <label>Source beat
        <select name="beat_id" defaultValue={currentBeatId||""}>
          <option value="">Original / no library beat</option>
          {beats.map(beat=><option key={beat.id} value={beat.id}>{beat.beat_code||"BEAT"} — {beat.title||"Untitled beat"}{beat.producer_name?` · ${beat.producer_name}`:""}</option>)}
        </select>
        <small>The beat remains reusable even after this replacement.</small>
      </label>
      <label>Replacement audio *
        <input name="track_file" type="file" accept="audio/*" required/>
      </label>
      <label>Replacement note
        <input name="version_note" maxLength={240} placeholder="Why is this replacing the previous version?"/>
      </label>
    </div>

    <div className="form-warning-alert">
      This keeps the same track record and track count. The previous audio remains in version history. Replacement is locked while voting is open.
    </div>

    {error&&<div className="form-error-alert" role="alert">{error}</div>}
    {message&&<div className="form-success-alert" role="status">{message}</div>}

    <button className="track-intake-submit" disabled={busy}>
      {busy?"Replacing track…":"Replace incomplete track"}
    </button>
  </form>;
}
