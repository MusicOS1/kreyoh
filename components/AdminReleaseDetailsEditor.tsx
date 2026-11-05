"use client";
import {useActionState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {editAdminRelease,type ReleaseEditState} from "../app/admin/(control)/releases/editActions";

type EditableRelease={
 id:string;title:string;artist_name:string;collection:string;genre:string;description:string;
 credits:string;track_number:number;explicit:boolean;debut:boolean;release_at:string;source_track_id?:string|null;
};
const initial:ReleaseEditState={ok:false,message:""};
function nairobiDate(value:string){
 const d=new Date(value);
 if(Number.isNaN(d.getTime()))return "";
 return new Intl.DateTimeFormat("sv-SE",{
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
  hour12:false,timeZone:"Africa/Nairobi"
 }).format(d).replace(" ","T");
}
export default function AdminReleaseDetailsEditor({release}:{release:EditableRelease}){
 const [state,action,pending]=useActionState(editAdminRelease,initial);
 const router=useRouter();
 const linked=Boolean(release.source_track_id);
 useEffect(()=>{if(state.ok&&state.message.startsWith("Release details saved"))router.refresh();},[state,router]);
 return <details className="fm-release-editor">
  <summary>Edit release details</summary>
  <form action={action}>
   <input name="release_id" type="hidden" value={release.id}/>
   <p>Correct a release without deleting it or resetting its plays, likes, comments or URL. No editing fees or pricing are involved.</p>
   {linked&&<p className="fm-release-editor-note">Project-linked release: correct public metadata here. Contributor credits and performing-artist changes must follow the project revision process so approved splits remain protected.</p>}
   <div className="fm-release-editor-grid">
    <label>Song title<input name="title" defaultValue={release.title} required maxLength={160} disabled={pending}/></label>
    <label>Artist display credit<input name="artist_name" defaultValue={release.artist_name} required maxLength={160} readOnly={linked} disabled={pending}/></label>
    <label>Album, EP or collection<input name="collection" defaultValue={release.collection||""} maxLength={160} disabled={pending}/></label>
    <label>Genre<input name="genre" defaultValue={release.genre||""} maxLength={80} disabled={pending}/></label>
    <label>Track number<input name="track_number" type="number" defaultValue={release.track_number||1} min={1} max={999} step={1} required disabled={pending}/></label>
    <label>Release date and time (Kenya)<input name="release_at" type="datetime-local" defaultValue={nairobiDate(release.release_at)} required disabled={pending}/></label>
    <label>Content label<select name="explicit" defaultValue={String(Boolean(release.explicit))} disabled={pending}><option value="false">Clean / not explicit</option><option value="true">Explicit</option></select></label>
    <label>Debut release<select name="debut" defaultValue={String(Boolean(release.debut))} disabled={pending}><option value="true">Yes</option><option value="false">No</option></select></label>
   </div>
   <label>Release description<textarea name="description" defaultValue={release.description||""} maxLength={2000} rows={3} disabled={pending}/></label>
   <label>Credits<textarea name="credits" defaultValue={release.credits||""} maxLength={5000} rows={4} readOnly={linked} disabled={pending}/></label>
   <p className="fm-release-editor-note">This corrects the public artist display name and credit text, not ownership or official artist-account attribution. Verify identities and rights in Catalogue attribution.</p>
   <label>Reason for correction (audit trail)<textarea name="reason" rows={2} minLength={10} maxLength={500} placeholder="What did the artist request and why?" required disabled={pending}/></label>
   <div className="fm-release-editor-controls">
    <button type="submit" disabled={pending}>{pending?"Saving corrections…":"Save release changes"}</button>
    <span>Existing audio and listener statistics will remain intact.</span>
   </div>
   {state.message&&<p role="status" className={state.ok?"fm-release-edit-ok":"fm-release-edit-error"}>{state.message}</p>}
  </form>
 </details>;
}
