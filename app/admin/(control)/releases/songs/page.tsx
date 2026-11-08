import Link from "next/link";
import {requireControlRoomPermission} from "../../../../../lib/controlRoom";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import AdminReleaseRow from "../../../../../components/AdminReleaseRow";
import BulkReleaseApproval from "../../../../../components/BulkReleaseApproval";
import AdminReleaseViewToggle from "../../../../../components/AdminReleaseViewToggle";
import "../release-editor.css";
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
  <div className="community-actions"><Link href="/admin/releases">← Stacked releases</Link><Link href="/admin/releases/bulk">+ Add new songs (bulk or singles)</Link><Link href="/admin/catalogue">Review artist credit & ownership</Link><Link href="/admin/discovery">Edit fan heroes</Link><Link href="/billboard">Open Billboard →</Link></div>
  <h1>All individual songs</h1>
  <p>This is the legacy individual-song review queue. Use <Link href="/admin/releases">Release stacks</Link> to browse full projects, EPs, mixtapes, albums, LPs and singles. Approve, reject or remove unpublished releases below. Edit cover artwork, credits and recordings without resetting song plays, likes, comments or links. Scheduled releases remain hidden until their release dates.</p>
  <form method="get" action="/admin/releases/songs" className="fm-release-search"><label htmlFor="release-q">Find a release</label><input id="release-q" name="q" defaultValue={q} placeholder="Song title or artist name"/><button type="submit">Search</button>{q&&<Link href="/admin/releases/songs">Clear</Link>}</form>
  <BulkReleaseApproval count={pendingCount||0}/>
  {!releases?.length&&<p>No releases on this page.</p>}
  <AdminReleaseViewToggle count={releases?.length||0}>
   {releases?.map(release=><AdminReleaseRow key={release.id} release={release}/>)}
  </AdminReleaseViewToggle>
  <nav className="bulk-pagination" aria-label="Release review pages"><Link aria-disabled={page<=1} href={`/admin/releases/songs?page=${Math.max(1,page-1)}${q?"&q="+encodeURIComponent(q):""}`}>← Previous</Link><span>Page {page} / {totalPages} · {count||0} reviewed or awaiting review</span><Link aria-disabled={page>=totalPages} href={`/admin/releases/songs?page=${Math.min(totalPages,page+1)}${q?"&q="+encodeURIComponent(q):""}`}>Next →</Link></nav>
 </main>;
}
