"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {prepareReleaseResult,finishReleaseResult,refreshReleaseUploadResult,updatePreparedReleaseProjectResult} from "../app/billboard/actions";

import {uploadReleaseFile} from "../lib/releaseRelayUpload";
import {formatBulkProjectDescription,RELEASE_CONTEXT_OPTIONS,RECORDING_QUALITY_OPTIONS} from "../lib/bulkReleaseProject";
import {
 readBulkUploadRecovery,saveBulkUploadRecovery,removeBulkUploadRecovery,
 findBulkUploadRecovery,fingerprintBulkFile
} from "../lib/bulkUploadRecovery";
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
 const [recoverableCount,setRecoverableCount]=useState(0);
 useEffect(()=>{setRecoverableCount(readBulkUploadRecovery().length);},[]);
 type Draft={id:string;uploadUrl:string;coverUploadUrl:string|null;
  audioDone:boolean;coverDone:boolean;fingerprint:string;restored:boolean;
  coverExpected:boolean;coverName:string;coverSize:number;coverType:string};
 const drafts=useRef(new Map<string,Draft>());
 const stopRef=useRef(false),input=useRef<HTMLInputElement>(null);const router=useRouter();
 const count=(status:Row["status"])=>rows.filter(row=>row.status===status).length;
 const update=(id:string,values:Partial<Row>)=>setRows(current=>current.map(row=>row.id===id?{...row,...values}:row));
 function saveDraft(row:Row,draft:Draft){
  saveBulkUploadRecovery({
   draftId:draft.id,fileName:row.file.name,fileSize:row.file.size,
   fileModified:row.file.lastModified,fingerprint:draft.fingerprint,
   title:row.title,artist:row.artist,number:row.number,
   collection,defaultArtist:artist,credits,genre,releaseDate,projectAbout,releaseContext,recordingQuality,
   coverExpected:draft.coverExpected,coverName:draft.coverName,coverSize:draft.coverSize,coverType:draft.coverType,
   audioDone:draft.audioDone,coverDone:draft.coverDone,updatedAt:Date.now()
  });
  setRecoverableCount(readBulkUploadRecovery().length);
 }
 function select(files:FileList|null){
  if(!files||busy)return;
  const chosen=Array.from(files).filter(file=>accepted.has(file.name.split(".").pop()?.toLowerCase()||""));
  const oversized=chosen.filter(file=>file.size>150*1024*1024||!file.size);
  const valid=chosen.filter(file=>file.size&&file.size<=150*1024*1024);
  const allowed=valid.slice(0,100);
  // The File object cannot survive a browser restart. Match reselected files
  // to prepared drafts by local filename, bytes and modification time;
  // re-check the full content fingerprint before resuming any network upload.
  const saved=readBulkUploadRecovery(),used=new Set<string>();
  drafts.current.clear();
  const restored=allowed.map((file,index)=>{
   const row=fromFile(file,index);
   const previous=findBulkUploadRecovery(file,saved,used);
   if(!previous)return row;
   used.add(previous.draftId);
   drafts.current.set(row.id,{
    id:previous.draftId,uploadUrl:"",coverUploadUrl:null,
    audioDone:false,coverDone:previous.coverDone,
    fingerprint:previous.fingerprint,restored:true,
    coverExpected:previous.coverExpected,coverName:previous.coverName,
    coverSize:previous.coverSize,coverType:previous.coverType||"image/jpeg"
   });
   return {...row,title:previous.title,artist:previous.artist,number:previous.number};
  });
  const matched=saved.find(item=>used.has(item.draftId));
  if(matched){
   setCollection(matched.collection);setArtist(matched.defaultArtist);
   setCredits(matched.credits);setGenre(matched.genre);setReleaseDate(matched.releaseDate);
   setProjectAbout(matched.projectAbout||"");setReleaseContext(matched.releaseContext||"");setRecordingQuality(matched.recordingQuality||"");
  }
  setRows(restored);setFinished(0);
  const baseMessage=oversized.length?oversized.length+" file(s) excluded: audio must be 150 MB or less.":chosen.length>100?"Select up to 100 tracks per batch.":"";
  const resumed=used.size?"Recovered "+used.size+" prepared draft(s). The files will be verified before resuming.":"";
  setNotice([baseMessage,resumed].filter(Boolean).join(" "));
 }
 async function processRow(row:Row){
  const filenameType=types[row.file.name.split(".").pop()?.toLowerCase()||""];
  if(!row.title.trim()||!(row.artist||artist).trim())throw Error("Add a song title and artist.");
  if(!filenameType||row.file.size>150*1024*1024)throw Error("Invalid audio or size over 150 MB.");
  const form=new FormData();
   // Admin catalogue uploads must never silently make the uploader the performing artist.
   form.set('catalogue_managed','on');
  form.set("title",row.title.trim());form.set("artist_name",(row.artist||artist).trim());
  form.set("collection",collection);form.set("track_number",String(row.number));
  form.set("genre",genre);form.set("credits",credits.trim());form.set("release_at",releaseDate);
  form.set("description",formatBulkProjectDescription({about:projectAbout,releaseContext,recordingQuality}));
  form.set("audio_type",filenameType);form.set("audio_size",String(row.file.size));
  if(cover){form.set("cover_type",cover.type);form.set("cover_size",String(cover.size));}
  form.set("rights","on");if(explicit)form.set("explicit","on");if(debut)form.set("debut","on");
  update(row.id,{status:"preparing",detail:"Verifying recording and preparing secure upload…"});
  const fingerprint=await fingerprintBulkFile(row.file);
  let draft=drafts.current.get(row.id);
  if(!draft){
   const prepared=await prepareReleaseResult(form);
   if(!prepared.ok)throw Error(prepared.error);
   draft={...prepared.value,audioDone:false,coverDone:false,fingerprint,
    restored:false,coverExpected:Boolean(cover),coverName:cover?.name||"",coverSize:cover?.size||0,coverType:cover?.type||""};
   drafts.current.set(row.id,draft);
   saveDraft(row,draft);
  } else {
   if(draft.fingerprint!==fingerprint)throw Error("This recording differs from the original prepared draft. Select the exact original file.");
   if(draft.coverExpected&&!draft.coverDone&&
     (!cover||cover.name!==draft.coverName||cover.size!==draft.coverSize))
    throw Error("Select the original shared cover artwork to resume this draft.");
   if(!draft.audioDone||(cover&&!draft.coverDone)){
    const refreshed=await refreshReleaseUploadResult(draft.id,cover?.type||draft.coverType||"");
    if(!refreshed.ok)throw Error(refreshed.error);
    Object.assign(draft,refreshed.value);
   }
  }
  update(row.id,{status:"uploading",detail:"Uploading audio to storage…"});
  if(!draft.audioDone){
   await uploadReleaseFile(draft.id,"audio",draft.uploadUrl,row.file,filenameType,"audio",
    message=>update(row.id,{detail:message}),draft.restored);
   draft.audioDone=true;
   saveDraft(row,draft);
  }
  if(cover&&draft.coverUploadUrl&&!draft.coverDone){
   update(row.id,{status:"cover",detail:"Uploading shared artwork…"});
   await uploadReleaseFile(draft.id,"cover",draft.coverUploadUrl,cover,cover.type,"shared cover",
    message=>update(row.id,{detail:message}),draft.restored);
   draft.coverDone=true;
   saveDraft(row,draft);
  }
  update(row.id,{status:"submitting",detail:"Saving project details and submitting for review…"});
  const updated=await updatePreparedReleaseProjectResult(draft.id,{
   collection,credits:credits.trim(),
   description:formatBulkProjectDescription({about:projectAbout,releaseContext,recordingQuality})
  });
  if(!updated.ok)throw Error(updated.error);
  const submitted=await finishReleaseResult(draft.id);
  if(!submitted.ok)throw Error(submitted.error);
  removeBulkUploadRecovery(draft.id);
  setRecoverableCount(readBulkUploadRecovery().length);
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
     <p>Secure, recoverable uploads. Name the project and explain the sound so listeners can distinguish demos and unmastered recordings from finished masters. Every song still enters the existing approval queue.</p></header>
   {recoverableCount>0&&<p className="bulk-info" role="status">
    {recoverableCount} unfinished prepared upload(s) saved on this device.
    Reselect the original audio files to recover their draft IDs and resume stored chunks.
    Do not choose different recordings with the same names.
   </p>}
   <div className="bulk-import-controls">
    <label>Audio files <input ref={input} type="file" multiple accept=".mp3,.wav,.m4a,.flac" disabled={busy||drafts.current.size>0} onChange={event=>select(event.target.files)}/></label>
    <label>Default artist name <input value={artist} onChange={event=>setArtist(event.target.value)} maxLength={100} disabled={busy||drafts.current.size>0} placeholder="For filenames without an artist"/></label>
    <label>Project name <input value={collection} onChange={event=>setCollection(event.target.value)} required maxLength={120} disabled={busy||drafts.current.size>0} placeholder="e.g. Dirty Economy"/></label>
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
      placeholder="Explain why these recordings are being shared and whether they are finished masters."/>
     <small>Shown to fans with recording labels. Required for demo, rough-mix, unmastered or work-in-progress uploads.</small>
    </label>
    <label>Genre <input value={genre} onChange={event=>setGenre(event.target.value)} maxLength={60} disabled={busy||drafts.current.size>0}/></label>
    <label>Release date (Kenya time) <input type="date" value={releaseDate} onChange={event=>setReleaseDate(event.target.value)} disabled={busy||drafts.current.size>0}/></label>
    <label>Shared cover artwork (optional) <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||drafts.current.size>0} onChange={event=>setCover(event.target.files?.[0]||null)}/></label>
    <label className="bulk-wide">Initial credits (optional)
     <textarea value={credits} onChange={event=>setCredits(event.target.value)} maxLength={2000} disabled={busy||drafts.current.size>0}
      placeholder="Known contributors, if available. Leave empty while credits are being verified."/>
     <small>Credits can be corrected through existing release and attribution controls after artist verification. This doesn't assign ownership or royalty splits.</small>
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
     {!busy&&rows.length>0&&<button type="button" onClick={()=>{
      setRows([]);drafts.current.clear();setFinished(0);
      if(input.current)input.current.value="";
      setNotice("Selection cleared. Any prepared drafts remain recoverable when you reselect their original files.");
     }}>Clear selection</button>}
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
