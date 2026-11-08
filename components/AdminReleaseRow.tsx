import Link from "next/link";
import {ReleaseManagement} from "./ReleaseControls";
import AdminReleaseAudioReplacement from "./AdminReleaseAudioReplacement";
import AdminReleaseDetailsEditor from "./AdminReleaseDetailsEditor";
import AdminReleaseCoverReplacement from "./AdminReleaseCoverReplacement";
import AdminDraftReview from "./AdminDraftReview";

/** The same moderation and metadata tools are available in a stack or in the flat queue. */
export default function AdminReleaseRow({release}:{release:any}){
 const date=new Date(release.release_at);
 return <details className="fm-release-item" id={"release-"+release.id}>
  <summary className="fm-release-summary">
   <span className="fm-release-thumb" style={release.cover_key?{backgroundImage:"url(/api/releases/"+release.id+"/media?kind=cover)"}:undefined} aria-hidden="true">♫</span>
   <span className="fm-release-row-copy">
    <strong title={release.title}>{release.title}</strong>
    <span className="fm-release-artist" title={release.artist_name}>{release.artist_name}</span>
    <small title={release.collection||"Single"}>{release.collection||"Single"}{release.genre?" · "+release.genre:""}</small>
   </span>
   <span className={"fm-release-status fm-release-status-"+release.status}>{release.status}</span>
   <span className="fm-release-row-date">{date.toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi",day:"numeric",month:"short",year:"numeric"})}</span>
   <span className="fm-release-row-manage">{["draft","pending","rejected"].includes(release.status)?"Review / Actions":"Manage"} <span aria-hidden="true">⌄</span></span>
  </summary>
  <div className="fm-release-detail-body">
   <div className="fm-release-detail-head">
    <h2>{release.title}</h2>
    <p>{release.artist_name} · {release.collection||"Single"} · {release.status} · Release {date.toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi"})}</p>
   </div>
   <div className="fm-release-preview">
    <span className="fm-release-preview-art" style={release.cover_key?{backgroundImage:"url(/api/releases/"+release.id+"/media?kind=cover)"}:undefined} aria-hidden="true">♫</span>
    <div className="fm-release-preview-info">
     <audio controls preload="none" src={"/api/releases/"+release.id+"/media"}/>
     {release.description&&<p className="preserve-lines">{release.description}</p>}
     <strong>Credits</strong>
     <p className="preserve-lines">{release.credits||"No credits supplied"}</p>
    </div>
   </div>
   <p>Rights confirmed: {release.rights_confirmed_at?new Date(release.rights_confirmed_at).toLocaleString("en-KE"):"No"}</p>
   {release.review_note&&<p>{release.review_note}</p>}
   {release.source_track_id
    ?<Link href={"/releases/"+release.id}>Review linked release · {release.workflow_state} →</Link>
    :["draft","pending","rejected"].includes(release.status)
     ?<AdminDraftReview id={release.id} status={release.status as "draft"|"pending"|"rejected"}/>
     :<ReleaseManagement id={release.id} status={release.status}/>}
   <p className="community-muted">Uploading and performing are different roles. Verify the artist and master ownership in <Link href="/admin/catalogue">Catalogue attribution</Link>.</p>
   <AdminReleaseDetailsEditor release={release}/>
   <AdminReleaseCoverReplacement releaseId={release.id} linked={Boolean(release.source_track_id)}/>
   <AdminReleaseAudioReplacement releaseId={release.id} title={release.title} linked={Boolean(release.source_track_id)}/>
  </div>
 </details>;
}
