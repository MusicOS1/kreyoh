"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { discardReusableTrackIntake, getReusableBeatOptions, prepareReusableTrackIntake, saveReusableTrackAsset } from "../app/tracks/reuseActions";

type BeatOption = { id:string; title:string|null; beat_code:string|null; producer_name:string|null; };
type MemberOption = { id:string; name:string; };
type CreditRow = { key:string; userId:string; role:string; };

const creditRoles = [
  ["artist","Artist"],["featured_artist","Featured artist"],["producer","Producer"],
  ["songwriter","Songwriter / composer"],["engineer","Recording engineer"],
  ["mix_engineer","Mix engineer"],["mastering_engineer","Mastering engineer"],
  ["vocalist","Vocalist"],["instrumentalist","Instrumentalist"],["a&r","A&R"],
  ["manager","Manager"],["visual_creative","Visual creative"],["other","Other contribution"],
] as const;

function newCredit():CreditRow {
  return { key: crypto.randomUUID(), userId:"", role:"artist" };
}

export default function TrackIntakeForm({beats,members}:{beats:BeatOption[];members:MemberOption[]}) {
  const router=useRouter();
  const [credits,setCredits]=useState<CreditRow[]>([newCredit()]);
  const [allBeats,setAllBeats]=useState<BeatOption[]>(beats);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let mounted=true;
    getReusableBeatOptions()
      .then((rows:any[])=>{
        if(!mounted)return;
        setAllBeats((rows||[]).map((beat:any)=>({
          id:beat.id,title:beat.title,beat_code:beat.beat_code,producer_name:beat.producer_name,
        })));
      })
      .catch(()=>undefined);
    return()=>{mounted=false};
  },[]);

  const beatOptions=useMemo(()=>{
    const map=new Map<string,BeatOption>();
    [...beats,...allBeats].forEach(beat=>map.set(beat.id,beat));
    return Array.from(map.values());
  },[beats,allBeats]);

  function updateCredit(key:string,change:Partial<CreditRow>){
    setCredits(current=>current.map(credit=>credit.key===key?{...credit,...change}:credit));
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const formData=new FormData(event.currentTarget);
    setBusy(true);setError("");setMessage("");
    let createdTrackId="";

    try{
      const file=formData.get("track_file");
      if(!(file instanceof File)||file.size<=0)throw new Error("Choose the track audio you want to upload.");

      const chosenCredits=credits.filter(c=>c.userId);
      if(!chosenCredits.length)throw new Error("Add at least one person to the track credits.");

      const prep=new FormData();
      prep.set("working_title",String(formData.get("working_title")||""));
      prep.set("track_code",String(formData.get("track_code")||""));
      prep.set("beat_id",String(formData.get("beat_id")||""));
      prep.set("development_status",String(formData.get("development_status")||"in_development"));
      prep.set("asset_kind",String(formData.get("asset_kind")||"demo"));
      prep.set("file_name",file.name);
      prep.set("file_type",file.type||"application/octet-stream");
      prep.set("file_size",String(file.size));
      chosenCredits.forEach(c=>{prep.append("credit_user_id",c.userId);prep.append("credit_role",c.role);});

      const signed=await prepareReusableTrackIntake(prep);
      createdTrackId=signed.trackId;

      const response=await fetch(signed.uploadUrl,{
        method:"PUT",
        headers:{"Content-Type":file.type||"application/octet-stream"},
        body:file,
      });
      if(!response.ok)throw new Error(`Cloudflare rejected the track transfer (${response.status}).`);

      const asset=new FormData();
      asset.set("track_id",signed.trackId);
      asset.set("storage_key",signed.storageKey);
      asset.set("file_name",file.name);
      asset.set("mime_type",file.type||"application/octet-stream");
      asset.set("asset_kind",String(formData.get("asset_kind")||"demo"));
      asset.set("version_note",String(formData.get("version_note")||""));
      await saveReusableTrackAsset(asset);

      setCredits([newCredit()]);
      setMessage("Track added. The source beat stays in the pool and can be used for another song.");
      setBusy(false);
      router.refresh();
    }catch(cause){
      if(createdTrackId){
        try{await discardReusableTrackIntake(createdTrackId);}catch{}
      }
      setBusy(false);
      setError(cause instanceof Error?cause.message:"The track could not be uploaded.");
    }
  }

  return <form onSubmit={submit} className="panel track-intake-form">
    <div className="track-intake-grid">
      <label>Track title *<input name="working_title" required placeholder="Working or final title"/></label>
      <label>Track code<input name="track_code" placeholder="Generated if blank"/></label>
      <label>Source beat
        <select name="beat_id" defaultValue="">
          <option value="">Original track / no library beat</option>
          {beatOptions.map(beat=><option key={beat.id} value={beat.id}>{beat.beat_code||"BEAT"} — {beat.title||"Untitled beat"}{beat.producer_name?` · ${beat.producer_name}`:""}</option>)}
        </select>
        <small>Beats stay in the library after being used. The same beat can create multiple songs or versions.</small>
      </label>
      <label>Starting stage
        <select name="development_status" defaultValue="in_development">
          <option value="in_development">In Development</option><option value="revision">Revision</option>
          <option value="in_studio">In Studio</option><option value="mixing">Mixing</option>
          <option value="mastering">Mastering</option><option value="release_ready">Release Ready</option>
          <option value="complete">Complete</option>
        </select>
      </label>
      <label>File type
        <select name="asset_kind" defaultValue="demo">
          <option value="demo">Demo</option><option value="rough_mix">Rough mix</option>
          <option value="mix">Mix</option><option value="master">Master</option><option value="reference">Reference</option>
        </select>
      </label>
      <label>Track audio *<input name="track_file" type="file" accept="audio/*" required/></label>
      <label>First-version note<input name="version_note" maxLength={280} placeholder="Demo context, changes needed, or recording note"/></label>
    </div>

    <section className="track-credit-editor">
      <div className="track-credit-heading">
        <div><span className="eyebrow">TRACK CREDITS</span><h3>Who contributed?</h3></div>
        <button type="button" className="track-credit-add" onClick={()=>setCredits(c=>[...c,newCredit()])}>+ Add credit</button>
      </div>
      <div className="track-credit-rows">
        {credits.map((credit,index)=><div className="track-credit-row" key={credit.key}>
          <span>{String(index+1).padStart(2,"0")}</span>
          <select aria-label={`Contributor ${index+1}`} value={credit.userId} onChange={e=>updateCredit(credit.key,{userId:e.target.value})}>
            <option value="">Choose project member</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select aria-label={`Credit role ${index+1}`} value={credit.role} onChange={e=>updateCredit(credit.key,{role:e.target.value})}>
            {creditRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" disabled={credits.length===1} onClick={()=>setCredits(c=>c.filter(item=>item.key!==credit.key))}>Remove</button>
        </div>)}
      </div>
    </section>

    {error&&<div className="form-error-alert" role="alert">{error}</div>}
    {message&&<div className="form-success-alert" role="status">{message}</div>}
    <button className="track-intake-submit" disabled={busy}>{busy?"Uploading track…":"Add track to project"}</button>
  </form>;
}
