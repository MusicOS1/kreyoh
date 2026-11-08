import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {ReleaseManagement} from "../../../../components/ReleaseControls";
import BulkReleaseApproval from "../../../../components/BulkReleaseApproval";
import AdminReleaseAudioReplacement from "../../../../components/AdminReleaseAudioReplacement";
import AdminReleaseDetailsEditor from "../../../../components/AdminReleaseDetailsEditor";
import AdminReleaseCoverReplacement from "../../../../components/AdminReleaseCoverReplacement";
import AdminReleaseViewToggle from "../../../../components/AdminReleaseViewToggle";
import AdminDraftReview from "../../../../components/AdminDraftReview";
import "./release-editor.css";
export default async function Releases({searchParams}:{searchParams:Promise<{page?:string;q?:string}>}){
 await requireControlRoomPermission("music");
 const params=await searchParams;
 const page=Math.max(1,Math.min(1000,Number.parseInt(params.page||"1",10)||1));
 const q=String(params.q||"").trim().replace(/[,%()]/g," ").slice(0,70);
 const admin=createAdminClient();
 let releaseQuery=admin.from("music_releases").select("*",{count:"exact"})
  .in("status",["draft","pending","published","rejected"]).order("submitted_at",{ascending:false});
 if(q)releaseQuery=releaseQuery.or(`title.ilike.%${q}%,artist_name.ilike.%${q}%`);
 const [{data:releases,error,count},{count:pendingCount}]=await Promise.all([
  releaseQuery.range((page-1)*15,page*15-1),
  admin.from("music_releases").select("id",{head:true,count:"exact"}).eq("status","pending")
 ]);
 if(error)throw Error("Could not load release reviews.");
 const totalPages=Math.max(1,Math.ceil((count||0)/15));
 return <main className="community-page">
  <div className="community-actions"><Link href="/admin/releases/bulk">+ Add new songs (bulk or singles)</Link><Link href="/admin/catalogue">Review artist credit & ownership</Link><Link href="/admin/discovery">Edit fan heroes</Link><Link href="/billboard">Open Billboard →</Link></div>
  <h1>Release management</h1>
  <p>Approve, reject or remove unpublished releases below. Edit cover artwork, credits and recordings without resetting song plays, likes, comments or links. Scheduled releases remain hidden until their release dates.</p>
  <form method="get" action="/admin/releases" className="fm-release-search"><label htmlFor="release-q">Find a release</label><input id="release-q" name="q" defaultValue={q} placeholder="Song title or artist name"/><button type="submit">Search</button>{q&&<Link href="/admin/releases">Clear</Link>}</form>
  <BulkReleaseApproval count={pendingCount||0}/>
  {!releases?.length&&<p>No releases on this page.</p>}
  <AdminReleaseViewToggle count={releases?.length||0}>
   {releases?.map(release=><details className="fm-release-item" key={release.id} id={"release-"+release.id}>
    <summary className="fm-release-summary">
     <span className="fm-release-thumb" style={release.cover_key?{backgroundImage:"url(/api/releases/"+release.id+"/media?kind=cover)"}:undefined} aria-hidden="true">♫</span>
     <span className="fm-release-row-copy">
      <strong title={release.title}>{release.title}</strong>
      <span className="fm-release-artist" title={release.artist_name}>{release.artist_name}</span>
      <small title={release.collection||"Single"}>{release.collection||"Single"}{release.genre?" · "+release.genre:""}</small>
     </span>
     <span className={"fm-release-status fm-release-status-"+release.status}>{release.status}</span>
     <span className="fm-release-row-date">{new Date(release.release_at).toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi",day:"numeric",month:"short",year:"numeric"})}</span>
     <span className="fm-release-row-manage">{["draft","pending","rejected"].includes(release.status)?"Review / Actions":"Manage"} <span aria-hidden="true">⌄</span></span>
    </summary>
    <div className="fm-release-detail-body">
     <div className="fm-release-detail-head">
      <h2>{release.title}</h2>
      <p>{release.artist_name} · {release.collection||"Single"} · {release.status} · Release {new Date(release.release_at).toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi"})}</p>
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
     {release.source_track_id?<Link href={"/releases/"+release.id}>Review linked release · {release.workflow_state} →</Link>:["draft","pending","rejected"].includes(release.status)?<AdminDraftReview id={release.id} status={release.status as "draft"|"pending"|"rejected"}/>:<ReleaseManagement id={release.id} status={release.status}/>}
     <p className="community-muted">Uploading and performing are different roles. Verify the artist and master ownership in <Link href="/admin/catalogue">Catalogue attribution</Link>.</p>
     <AdminReleaseDetailsEditor release={release}/>
     <AdminReleaseCoverReplacement releaseId={release.id} linked={Boolean(release.source_track_id)}/>
     <AdminReleaseAudioReplacement releaseId={release.id} title={release.title} linked={Boolean(release.source_track_id)}/>
    </div>
   </details>)}
  </AdminReleaseViewToggle>
  <nav className="bulk-pagination" aria-label="Release review pages"><Link aria-disabled={page<=1} href={`/admin/releases?page=${Math.max(1,page-1)}${q?"&q="+encodeURIComponent(q):""}`}>← Previous</Link><span>Page {page} / {totalPages} · {count||0} reviewed or awaiting review</span><Link aria-disabled={page>=totalPages} href={`/admin/releases?page=${Math.min(totalPages,page+1)}${q?"&q="+encodeURIComponent(q):""}`}>Next →</Link></nav>
 </main>;
}
