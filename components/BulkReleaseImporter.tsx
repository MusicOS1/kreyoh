"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {prepareReleaseResult,finishReleaseResult,refreshReleaseUploadResult} from "../app/billboard/actions";

import {uploadReleaseFile} from "../lib/releaseRelayUpload";
import {formatBulkProjectDescription,RELEASE_CONTEXT_OPTIONS,RECORDING_QUALITY_OPTIONS} from "../lib/bulkReleaseProject";
type Row={id:string;file:File;title:string;artist:string;number:number;status:"ready"|"preparing"|"uploading"|"cover"|"submitting"|"done"|"failed";detail:string;};
const accepted=new Set(["mp3","wav","m4a","flac"]);
const types:Record<string,string>={mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",flac:"audio/flac"};
const human=(bytes:number)=>bytes>=1048576?(bytes/1048576).toFixed(1)+" MB":(bytes/1024).toFixed(1)+" KB";
function fromFile(file:File,index:number):Row{
 const base=file.name.replace(/\.(mp3|wav|m4a|flac)$/i,"").replace(/^\d{1,3}[.\s_-]+/,"").trim();
 const parts=base.split(/\s+-\s+/);
 return{id:crypto.randomUUID(),file,title:parts.length>1?parts.slice(1).join(" - "):base,
   artist:parts.length>1?parts[0]:"",number:index+1,status:"ready",detail:""};
}

export default function BulkReleaseImporter(){
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false);
 const [collection,setCollection]=useState(""),[artist,setArtist]=useState(""),[credits,setCredits]=useState("");
 const [projectAbout,setProjectAbout]=useState(""),[releaseContext,setReleaseContext]=useState("");
 const [recordingQuality,setRecordingQuality]=useState("");
 const [genre,setGenre]=useState(""),[releaseDate,setReleaseDate]=useState(""),[cover,setCover]=useState<File|null>(null);
 const [explicit,setExplicit]=useState(false),[debut,setDebut]=useState(true),[rights,setRights]=useState(false);
 const [notice,setNotice]=useState(""),[finished,setFinished]=useState(0);
 const drafts=useRef(new Map<string,{id:string;uploadUrl:string;coverUploadUrl:string|null;audioDone:boolean;coverDone:boolean}>());
 const stopRef=useRef(false),input=useRef<HTMLInputElement>(null);const router=useRouter();
 const count=(status:Row["status"])=>rows.filter(row=>row.status===status).length;
 const update=(id:string,values:Partial<Row>)=>setRows(current=>current.map(row=>row.id===id?{...row,...values}:row));
 function select(files:FileList|null){
  if(!files||busy)return;
  const chosen=Array.from(files).filter(file=>accepted.has(file.name.split(".").pop()?.toLowerCase()||""));
  const oversized=chosen.filter(file=>file.size>150*1024*1024||!file.size);
  const valid=chosen.filter(file=>file.size&&file.size<=150*1024*1024);
  const allowed=valid.slice(0,100);
  drafts.current.clear();setRows(allowed.map(fromFile));setFinished(0);
  setNotice(oversized.length?oversized.length+" file(s) excluded: audio must be 150 MB or less.":chosen.length>100?"Select up to 100 tracks per batch.":"");
 }
 async function processRow(row:Row){
  const filenameType=types[row.file.name.split(".").pop()?.toLowerCase()||""];
  if(!row.title.trim()||!(row.artist||artist).trim())throw Error("Add a song title and artist.");
  if(!filenameType||row.file.size>150*1024*1024)throw Error("Invalid audio or size over 150 MB.");
  const form=new FormData();
  form.set("title",row.title.trim());form.set("artist_name",(row.artist||artist).trim());
  form.set("collection",collection);form.set("track_number",String(row.number));
  form.set("genre",genre);form.set("credits",credits.trim());form.set("release_at",releaseDate);
  form.set("description",formatBulkProjectDescription({about:projectAbout,releaseContext,recordingQuality}));
  form.set("audio_type",filenameType);form.set("audio_size",String(row.file.size));
  if(cover){form.set("cover_type",cover.type);form.set("cover_size",String(cover.size));}
  form.set("rights","on");if(explicit)form.set("explicit","on");if(debut)form.set("debut","on");
  update(row.id,{status:"preparing",detail:"Preparing secure upload…"});
  let draft=drafts.current.get(row.id);
  if(!draft){
   const prepared=await prepareReleaseResult(form);
   if(!prepared.ok)throw Error(prepared.error);
   draft={...prepared.value,audioDone:false,coverDone:false};
   drafts.current.set(row.id,draft);
  } else if(!draft.audioDone||(cover&&!draft.coverDone)) {
   const refreshed=await refreshReleaseUploadResult(draft.id,cover?.type||"");
   if(!refreshed.ok)throw Error(refreshed.error);
   Object.assign(draft,refreshed.value);
  }
  update(row.id,{status:"uploading",detail:"Uploading audio to storage…"});
  if(!draft.audioDone){
   await uploadReleaseFile(draft.id,"audio",draft.uploadUrl,row.file,filenameType,"audio",message=>update(row.id,{detail:message}));
   draft.audioDone=true;
  }
  if(cover&&draft.coverUploadUrl&&!draft.coverDone){
   update(row.id,{status:"cover",detail:"Uploading shared artwork…"});
   await uploadReleaseFile(draft.id,"cover",draft.coverUploadUrl,cover,cover.type,"shared cover",message=>update(row.id,{detail:message}));
   draft.coverDone=true;
  }
  update(row.id,{status:"submitting",detail:"Submitting for review…"});
  const submitted=await finishReleaseResult(draft.id);
  if(!submitted.ok)throw Error(submitted.error);
  update(row.id,{status:"done",detail:"Queued for admin review"});
 }
 async function start(){
  if(busy||!rights)return;
  const queue=rows.filter(row=>row.status==="ready"||row.status==="failed");
  if(!queue.length)return;
  if(!artist.trim()&&queue.some(row=>!row.artist.trim())){setNotice("Add an artist to each song or enter a default artist.");return;}
  if(!collection.trim()){setNotice("Enter a project name so listeners can see which project the songs belong to.");return;}
  if((releaseContext==="Studio work in progress"||["Demo recording","Rough mix","Unmastered"].includes(recordingQuality))&&!projectAbout.trim()){
   setNotice("Explain the project so listeners understand why these recordings are works in progress.");return;
  }
  try{formatBulkProjectDescription({about:projectAbout,releaseContext,recordingQuality});}
  catch(error){setNotice(error instanceof Error?error.message:"Review project information.");return;}
  if(cover&&(cover.size>10*1024*1024||!["image/jpeg","image/png","image/webp"].includes(cover.type))){
   setNotice("Artwork must be JPG, PNG or WebP and at most 10 MB.");return;
  }
  stopRef.current=false;setBusy(true);setNotice("Uploading tracks individually. Keep this browser tab open.");
  for(const row of queue){
   if(stopRef.current)break;
   try{await processRow(row);setFinished(previous=>previous+1);}
   catch(error){update(row.id,{status:"failed",detail:error instanceof Error?error.message:"Upload failed."});}
  }
  setBusy(false);router.refresh();
  setNotice(stopRef.current?"Paused after the current song. You can resume remaining tracks.":"Batch finished. Review the status of each track below.");
 }
 return <section className="bulk-importer">
   <header><span className="eyebrow">CATALOGUE INTAKE / R2</span><h2>Import up to 100 songs</h2>
     <p>Secure, one-at-a-time direct-to-storage uploads. Each song receives its own release record and enters the approval queue. Give the batch a project name and context so listeners can distinguish early recordings from finished masters.</p></header>
   <div className="bulk-import-controls">
    <label>Audio files <input ref={input} type="file" multiple accept=".mp3,.wav,.m4a,.flac" disabled={busy||drafts.current.size>0} onChange={event=>select(event.target.files)}/></label>
    <label>Default artist name <input value={artist} onChange={event=>setArtist(event.target.value)} maxLength={100} disabled={busy||drafts.current.size>0} placeholder="For filenames without an artist"/></label>
    <label>Project name <input value={collection} onChange={event=>setCollection(event.target.value)} required maxLength={120} disabled={busy||drafts.current.size>0} placeholder="e.g. PROJECT 001 — TUKO WATU WENGI"/></label>
    <label>Release context
     <select value={releaseContext} onChange={event=>setReleaseContext(event.target.value)} disabled={busy||drafts.current.size>0}>
      <option value="">Not specified</option>
      {RELEASE_CONTEXT_OPTIONS.map(option=><option value={option} key={option}>{option}</option>)}
     </select>
    </label>
    <label>Recording quality
     <select value={recordingQuality} onChange={event=>setRecordingQuality(event.target.value)} disabled={busy||drafts.current.size>0}>
      <option value="">Not specified</option>
      {RECORDING_QUALITY_OPTIONS.map(option=><option value={option} key={option}>{option}</option>)}
     </select>
    </label>
    <label className="bulk-wide">About the project
     <textarea value={projectAbout} onChange={event=>setProjectAbout(event.target.value)} maxLength={1500} rows={4} disabled={busy||drafts.current.size>0}
      placeholder="Explain the creative process, why these tracks are being shared and whether the recordings are unfinished."/>
     <small>Shown to fans with the release and quality labels. Required for demo, rough-mix, unmastered or work-in-progress uploads.</small>
    </label>
    <label>Genre <input value={genre} onChange={event=>setGenre(event.target.value)} maxLength={60} disabled={busy||drafts.current.size>0}/></label>
    <label>Release date (Kenya time) <input type="date" value={releaseDate} onChange={event=>setReleaseDate(event.target.value)} disabled={busy||drafts.current.size>0}/></label>
    <label>Shared cover artwork (optional) <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||drafts.current.size>0} onChange={event=>setCover(event.target.files?.[0]||null)}/></label>
    <label className="bulk-wide">Initial credits (optional)
     <textarea value={credits} onChange={event=>setCredits(event.target.value)} maxLength={2000} disabled={busy||drafts.current.size>0}
      placeholder="Known contributors, if available. Leave empty while credits are being verified."/>
     <small>Credits can be corrected through existing release and attribution controls after the artist is verified. No ownership or royalty split is assigned by this field.</small>
    </label>
   </div>
   <div className="bulk-flags">
    <label><input type="checkbox" checked={debut} disabled={busy||drafts.current.size>0} onChange={event=>setDebut(event.target.checked)}/> First public release</label>
    <label><input type="checkbox" checked={explicit} disabled={busy||drafts.current.size>0} onChange={event=>setExplicit(event.target.checked)}/> Explicit content</label>
    <label><input type="checkbox" checked={rights} disabled={busy||drafts.current.size>0} onChange={event=>setRights(event.target.checked)}/> I confirm permission from the rights holders for every track and its artwork, credits and public streaming.</label>
   </div>
   <div className="bulk-progress">
    <div><strong>{rows.length} selected</strong><span>{count("done")} submitted · {count("failed")} failed · {count("ready")} ready</span></div>
    <div className="bulk-progress-meter"><span style={{width:rows.length?((count("done")+count("failed"))/rows.length*100)+"%":"0%"}}/></div>
    <div className="bulk-controls">
     <button type="button" disabled={busy||!rights||!rows.some(r=>r.status==="ready"||r.status==="failed")} onClick={()=>void start()}>{busy?"Uploading…":"Upload ready / retry failed"}</button>
     {busy&&<button type="button" onClick={()=>{stopRef.current=true;setNotice("Pausing after current file…");}}>Pause after this song</button>}
     {!busy&&rows.length>0&&<button type="button" onClick={()=>{setRows([]);drafts.current.clear();setFinished(0);if(input.current)input.current.value="";}}>Clear batch</button>}
    </div>
    {notice&&<p role="status">{notice}</p>}
    {finished>0&&<p className="bulk-info">Already uploaded: {finished}. Do not close this tab while uploading; completed songs are saved separately.</p>}
   </div>
   {rows.length>0&&<div className="bulk-track-list" aria-label="Selected tracks">{rows.map((row,index)=><article key={row.id}>
    <div className="bulk-track-count">{String(index+1).padStart(2,"0")}</div>
    <div className="bulk-track-fields">
     <label>Title <input disabled={busy||drafts.current.has(row.id)} value={row.title} maxLength={120} onChange={e=>update(row.id,{title:e.target.value})}/></label>
     <label>Artist <input disabled={busy||drafts.current.has(row.id)} value={row.artist} maxLength={100} placeholder={artist||"Artist name"} onChange={e=>update(row.id,{artist:e.target.value})}/></label>
     <label>Track # <input type="number" min={1} max={100} disabled={busy||drafts.current.has(row.id)} value={row.number} onChange={e=>update(row.id,{number:Number(e.target.value)})}/></label>
    </div>
    <div className="bulk-track-state"><small>{row.file.name} · {human(row.file.size)}</small><strong data-status={row.status}>{row.status==="done"?"Submitted":row.status==="failed"?"Needs attention":row.status==="ready"?"Ready":row.status}</strong>{row.detail&&<p>{row.detail}</p>}</div>
   </article>)}</div>}
  </section>;
}
