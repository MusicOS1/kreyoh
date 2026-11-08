import Link from "next/link";
import {notFound} from "next/navigation";
import {requireControlRoomPermission} from "../../../../../../lib/controlRoom";
import {createAdminClient} from "../../../../../../lib/supabase/admin";
import AdminReleaseRow from "../../../../../../components/AdminReleaseRow";
import AdminReleaseViewToggle from "../../../../../../components/AdminReleaseViewToggle";
import AdminReleasePackageFormat from "../../../../../../components/AdminReleasePackageFormat";
import "../../release-editor.css";

const formats:{[key:string]:string}={project:"Project",ep:"EP",mixtape:"Mixtape",album:"Album",lp:"LP"};
const PAGE_SIZE=30;
export default async function ManagedReleasePackage({params,searchParams}:{
 params:Promise<{packageId:string}>;searchParams:Promise<{page?:string;q?:string}>
}){
 await requireControlRoomPermission("music");
 const {packageId}=await params,filter=await searchParams;
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(packageId))notFound();
 const admin=createAdminClient();
 const {data:packageRow,error:packageError}=await admin.from("music_release_packages")
  .select("id,name,format,created_at,updated_at").eq("id",packageId).maybeSingle();
 if(packageError)throw Error("Collection information is temporarily unavailable.");
 if(!packageRow)notFound();
 const page=Math.min(10000,Math.max(1,Number.parseInt(filter.page||"1",10)||1));
 const q=String(filter.q||"").trim().replace(/[,%()]/g," ").slice(0,90);
 let tracks=admin.from("music_releases").select("*",{count:"exact"})
  .eq("package_id",packageId)
  .order("track_number",{ascending:true}).order("created_at",{ascending:true}).order("id");
 if(q)tracks=tracks.or(`title.ilike.%${q}%,artist_name.ilike.%${q}%`);
 const [{data:releases,error,count},{count:pendingCount}]=await Promise.all([
  tracks.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1),
  admin.from("music_releases").select("id",{head:true,count:"exact"}).eq("package_id",packageId).eq("status","pending")
 ]);
 if(error)throw Error("Could not load the songs in this collection.");
 const pages=Math.max(1,Math.ceil((count||0)/PAGE_SIZE));
 const category=formats[packageRow.format]||"Project";
 const pageLink=(target:number)=>"/admin/releases/packages/"+packageId+"?"+new URLSearchParams({
  ...(q?{q}:{}),...(target>1?{page:String(target)}:{})
 }).toString();
 return <main className="community-page fm-release-stack-page">
  <div className="community-actions"><Link href="/admin/releases">← All release stacks</Link><Link href="/admin/releases/songs">Individual songs</Link><Link href="/admin/releases/bulk">+ Add songs</Link></div>
  <span className="eyebrow">FACKTS MUSIC · {category.toUpperCase()}</span>
  <h1>{packageRow.name}</h1>
  <p>This is one collection. Tracks keep individual credits, approval status and statistics. Withdrawn tracks remain visible here for administration, but are not made public. A new project name entered on a song moves it to that collection without deleting it.</p>
  <div className="fm-package-detail-controls">
   <AdminReleasePackageFormat id={packageRow.id} format={packageRow.format}/>
   <p><strong>{count||0}</strong> tracks matching the filter · <strong>{pendingCount||0}</strong> awaiting review</p>
  </div>
  <form action={"/admin/releases/packages/"+packageId} method="get" className="fm-release-search">
   <label htmlFor="package-song-q">Find a track<input id="package-song-q" name="q" defaultValue={q} placeholder="Song title or artist credit"/></label>
   <button type="submit">Search</button>
   {q&&<Link href={"/admin/releases/packages/"+packageId}>Clear</Link>}
  </form>
  {!releases?.length&&<p>No songs match this search.</p>}
  <AdminReleaseViewToggle count={releases?.length||0}>
   {(releases||[]).map(song=><AdminReleaseRow key={song.id} release={song}/>)}
  </AdminReleaseViewToggle>
  <nav className="bulk-pagination" aria-label="Tracks in release pages">
   <Link aria-disabled={page<=1} href={pageLink(Math.max(1,page-1))}>← Previous</Link>
   <span>Page {page} / {pages}</span>
   <Link aria-disabled={page>=pages} href={pageLink(Math.min(pages,page+1))}>Next →</Link>
  </nav>
 </main>;
}
