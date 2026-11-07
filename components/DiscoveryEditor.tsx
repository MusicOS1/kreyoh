"use client";
import {useActionState,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {backgroundFormAction} from "../lib/backgroundInteraction";
import type {DiscoveryItem} from "../lib/discoveryContent";
import AdminEditorialImageUpload from "./AdminEditorialImageUpload";
import HeroImagePositioner from "./HeroImagePositioner";

export default function DiscoveryEditor({item}:{item?:DiscoveryItem}){
 const router=useRouter();
 const [state,action,pending]=useActionState(
  backgroundFormAction<{message:string;id?:string;removed?:boolean}>("editorial",{message:""}),{message:""});
 const [kind,setKind]=useState<"show"|"feature">(item?.kind||"show");
 const [image,setImage]=useState(item?.image||"");
 const [programmeImage,setProgrammeImage]=useState(item?.programmeImage||"");
 const [crop,setCrop]=useState({imageX:item?.imageX??50,imageY:item?.imageY??50,imageZoom:item?.imageZoom??100});
 const [uploadingMain,setUploadingMain]=useState(false);
 const [uploadingProgramme,setUploadingProgramme]=useState(false);
 const uploading=uploadingMain||uploadingProgramme;
 useEffect(()=>{if(state.message==="Content saved."||state.removed)router.refresh();},
  [state.message,state.removed,router]);
 if(state.removed)return <p role="status">{state.message}</p>;
 return <form action={action} className="discovery-editor fm-event-editor">
  <input type="hidden" name="id" value={state.id||item?.id||""}/>
  <input type="hidden" name="imageX" value={crop.imageX}/>
  <input type="hidden" name="imageY" value={crop.imageY}/>
  <input type="hidden" name="imageZoom" value={crop.imageZoom}/>
  <label>Content type
   <select name="kind" value={kind} onChange={e=>setKind(e.target.value as "show"|"feature")}>
    <option value="show">Show / live session</option>
    <option value="feature">Featured story / announcement</option>
   </select>
  </label>
  <label>Title<input name="title" required maxLength={120} defaultValue={item?.title}
    placeholder="The Third Culture Live Sessions 001"/></label>
  <label>Description<textarea name="description" maxLength={600} rows={4} defaultValue={item?.description}
    placeholder="Tell fans what the event or episode is about."/></label>
  <div className="fm-event-editor-section">
   <h3>Artwork and main image</h3>
   <p>This is the image fans see on the main Shows hero. You don't need to upload it in Hero Studio.</p>
   <label>Poster URL (or upload below)
    <input type="text" name="image" value={image} maxLength={600}
     onChange={e=>setImage(e.target.value)} placeholder="Upload an event poster or use https://…"/>
   </label>
   <AdminEditorialImageUpload image={image} onUploaded={setImage} onBusyChange={setUploadingMain}
    label="Upload show poster or hero image"/>
   <HeroImagePositioner image={image} x={crop.imageX} y={crop.imageY} zoom={crop.imageZoom}
    onChange={setCrop} label="Position the show hero image"/>
  </div>
  {kind==="show"&&<>
   <div className="fm-event-editor-section">
    <h3>Event details</h3>
    <label className="fm-event-feature"><input name="featured" type="checkbox" defaultChecked={item?.featured||false}/>
     Feature this show on the Shows homepage</label>
    <p>One published show automatically appears as the main hero; choose this for your preferred featured show.</p>
    <div className="fm-event-editor-fields">
     <label>Starts (Kenya time, EAT)<input name="eventStart" type="datetime-local" defaultValue={item?.eventStart||""}/></label>
     <label>Ends (Kenya time, EAT)<input name="eventEnd" type="datetime-local" defaultValue={item?.eventEnd||""}/></label>
    </div>
    <label>Venue or streaming platform<input name="venue" maxLength={120} defaultValue={item?.venue||""}
     placeholder="Nairobi studio / YouTube @_thethirdculture"/></label>
    <label>Artists and guests (one name per line)
     <textarea name="artistNames" rows={5} maxLength={2000} defaultValue={(item?.artistNames||[]).join("\n")}
      placeholder={"Artist name\nGuest artist\nProducer or host"}/>
    </label>
   </div>
   <div className="fm-event-editor-section">
    <h3>Programme / running order</h3>
    <p>Share the order of performances and, if you have a programme poster, upload it below.</p>
    <label>Programme (one activity per line)
     <textarea name="programme" rows={6} maxLength={4000} defaultValue={item?.programme||""}
      placeholder={"2:00 PM — Doors open\n3:00 PM — First live set\n5:00 PM — Artist conversations"}/>
    </label>
    <label>Programme image URL (or upload below)
     <input name="programmeImage" type="text" maxLength={600} value={programmeImage}
      onChange={e=>setProgrammeImage(e.target.value)}
      placeholder="Upload a pictorial programme or use https://…"/>
    </label>
    <AdminEditorialImageUpload image={programmeImage} onUploaded={setProgrammeImage}
     onBusyChange={setUploadingProgramme} label="Upload programme poster / schedule image"/>
   </div>
  </>}
  <label>{kind==="show"?"Live stream / watch URL":"Read more / details URL"}
   <input type="url" name="url" placeholder="https://www.youtube.com/…" defaultValue={item?.url}/>
  </label>
  <label>Display order<input name="position" type="number" min={0} max={999} defaultValue={item?.position??0}/></label>
  <label className="fm-event-feature"><input name="published" type="checkbox" defaultChecked={item?.published}/>
   Show publicly on FACKTS Music</label>
  <p className="hero-admin-hint">Save as draft until ready. Published shows get a fan-facing details page and a clickable feature automatically.</p>
  <div className="fm-event-editor-actions">
   <button disabled={pending||uploading} type="submit" name="intent" value="save">
    {pending?"Saving…":uploading?"Uploading image…":"Save show / content"}
   </button>
   {(item||state.id)&&<button disabled={pending||uploading} name="intent" value="delete" type="submit"
    formNoValidate onClick={e=>{if(!confirm("Remove this content item?"))e.preventDefault();}}>Delete</button>}
  </div>
  {state.message&&<p role="status" className={state.message.startsWith("Could not")?"hero-admin-error":"hero-admin-success"}>{state.message}</p>}
 </form>;
}
