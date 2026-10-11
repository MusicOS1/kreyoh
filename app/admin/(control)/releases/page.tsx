import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {ReleaseManagement} from "../../../../components/ReleaseControls";
import BulkReleaseApproval from "../../../../components/BulkReleaseApproval";
export default async function Releases({searchParams}:{searchParams:Promise<{page?:string}>}){
 await requireControlRoomPermission("music");
 const page=Math.max(1,Math.min(1000,Number.parseInt((await searchParams).page||"1",10)||1));
 const admin=createAdminClient();
 const [{data:releases,error,count},{count:pendingCount}]=await Promise.all([
  admin.from("music_releases").select("id,title,artist_name,collection,description,credits,status,release_at,rights_confirmed_at,cover_key,review_note",{count:"exact"})
   .in("status",["pending","published","rejected"]).order("submitted_at",{ascending:false}).range((page-1)*15,page*15-1),
  admin.from("music_releases").select("id",{head:true,count:"exact"}).eq("status","pending")
 ]);
 if(error)throw Error("Could not load release reviews.");
 const totalPages=Math.max(1,Math.ceil((count||0)/15));
 return <main className="community-page">
  <div className="community-actions"><Link href="/admin/releases/bulk">↑ Import up to 100 songs</Link><Link href="/admin/discovery">Edit fan heroes</Link><Link href="/billboard">Open Billboard →</Link></div>
  <h1>Release review</h1>
  <p>Listen to finished recordings and verify artwork, credits and permissions. Approvals with future dates go public when the date arrives in Kenya.</p>
  <BulkReleaseApproval count={pendingCount||0}/>
  {!releases?.length&&<p>No releases on this page.</p>}
  {releases?.map(release=><article className="community-card" key={release.id}>
    <h2>{release.title} — {release.artist_name}</h2>
    <p>{release.collection||"Single"} · {release.status} · Release {new Date(release.release_at).toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi"})}</p>
    {release.cover_key&&<img className="release-review-cover" src={`/api/releases/${release.id}/media?kind=cover`} alt="Submitted cover"/>}
    <audio controls preload="none" src={`/api/releases/${release.id}/media`}/>
    <p className="preserve-lines">{release.description}</p><h3>Credits</h3><p className="preserve-lines">{release.credits}</p>
    <p>Rights confirmed: {release.rights_confirmed_at?new Date(release.rights_confirmed_at).toLocaleString("en-KE"):"No"}</p>
    {release.review_note&&<p>{release.review_note}</p>}
    <ReleaseManagement id={release.id} status={release.status}/>
   </article>)}
  <nav className="bulk-pagination" aria-label="Release review pages"><Link aria-disabled={page<=1} href={`/admin/releases?page=${Math.max(1,page-1)}`}>← Previous</Link><span>Page {page} / {totalPages} · {count||0} reviewed or awaiting review</span><Link aria-disabled={page>=totalPages} href={`/admin/releases?page=${Math.min(totalPages,page+1)}`}>Next →</Link></nav>
 </main>;
}
