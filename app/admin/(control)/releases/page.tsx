import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {createAdminClient} from "../../../../lib/supabase/admin";
import AdminReleasePackageFormat from "../../../../components/AdminReleasePackageFormat";
import AdminReleaseRow from "../../../../components/AdminReleaseRow";
import AdminReleaseViewToggle from "../../../../components/AdminReleaseViewToggle";
import BulkReleaseApproval from "../../../../components/BulkReleaseApproval";
import "./release-editor.css";

const filters=[
 {id:"all",label:"All collections"},
 {id:"project",label:"Projects"},
 {id:"ep",label:"EPs"},
 {id:"mixtape",label:"Mixtapes"},
 {id:"album",label:"Albums"},
 {id:"lp",label:"LPs"},
 {id:"single",label:"Singles"}
] as const;
const types=new Set(filters.map(x=>x.id));
const PAGE_SIZE=18;
type Filter=(typeof filters)[number]["id"];
const label=(value:string)=>filters.find(x=>x.id===value)?.label||"Projects";
const url=(kind:Filter,q:string,page:number)=>"/admin/releases?"+new URLSearchParams({
 ...(kind!=="all"?{kind}:{}),...(q?{q}:{}),...(page>1?{page:String(page)}:{})
}).toString();

export default async function ReleaseStacks({searchParams}:{searchParams:Promise<{page?:string;kind?:string;q?:string}>}){
 await requireControlRoomPermission("music");
 const query=await searchParams;
 const kind:Filter=types.has(query.kind||"")?query.kind as Filter:"all";
 const q=String(query.q||"").trim().replace(/[,%()]/g," ").slice(0,90);
 const page=Math.min(10000,Math.max(1,Number.parseInt(query.page||"1",10)||1));
 const admin=createAdminClient();
 const [{count:pendingCount},{count:allCount},{count:singleCount},{count:collectionCount}]=await Promise.all([
  admin.from("music_releases").select("id",{head:true,count:"exact"}).eq("status","pending"),
  admin.from("music_releases").select("id",{head:true,count:"exact"}).in("status",["draft","pending","published","rejected"]),
  admin.from("music_releases").select("id",{head:true,count:"exact"}).is("package_id",null).in("status",["draft","pending","published","rejected"]),
  admin.from("music_release_packages").select("id",{head:true,count:"exact"})
 ]);
 const basics=<>
  <div className="community-actions fm-release-stack-actions">
   <Link href="/admin/releases/bulk">Add new songs (bulk or singles)</Link>
   <Link href="/admin/releases/songs">All individual songs / approvals</Link>
   <Link href="/admin/catalogue">Review credits &amp; rights</Link>
   <Link href="/billboard">Open Billboard ↗</Link>
  </div>
  <span className="eyebrow">FACKTS MUSIC · CATALOGUE OPERATIONS</span>
  <h1>Public releases</h1>
  <p>Manage a complete release as one stack instead of sorting through songs individually. Open any collection to review its tracks, change the release format, edit songs or moderate drafts. Grouping never moves copyrights, royalties, recordings or play counts.</p>
  <div className="fm-package-overview" aria-label="Catalogue overview">
   <div><strong>{allCount||0}</strong><span>Songs</span></div>
   <div><strong>{collectionCount||0}</strong><span>Collections</span></div>
   <div><strong>{singleCount||0}</strong><span>Singles</span></div>
   <div><strong>{pendingCount||0}</strong><span>Awaiting review</span></div>
  </div>
  <BulkReleaseApproval count={pendingCount||0}/>
  <nav className="fm-package-tabs" aria-label="Release category filters">
   {filters.map(item=><Link key={item.id} href={url(item.id,"",1)} aria-current={kind===item.id?"page":undefined}>{item.label}</Link>)}
  </nav>
  <form action="/admin/releases" method="get" className="fm-release-search">
   {kind!=="all"&&<input type="hidden" name="kind" value={kind}/>}
   <label htmlFor="release-q">Find collection<input id="release-q" name="q" defaultValue={q} placeholder={kind==="single"?"Song title or artist":"Project, EP, mixtape or album name"}/></label>
   <button type="submit">Search</button>
   {q&&<Link href={url(kind,"",1)}>Clear</Link>}
  </form>
 </>;
 if(kind==="single"){
  let singles=admin.from("music_releases").select("*",{count:"exact"}).is("package_id",null)
   .in("status",["draft","pending","published","rejected"]).order("created_at",{ascending:false});
  if(q)singles=singles.or(`title.ilike.%${q}%,artist_name.ilike.%${q}%`);
  const {data,error,count}=await singles.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
  if(error)throw Error("Standalone singles could not be loaded.");
  const pages=Math.max(1,Math.ceil((count||0)/PAGE_SIZE));
  return <main className="community-page fm-release-stack-page">{basics}
   <div className="fm-package-result-heading"><h2>Singles</h2><p>{count||0} standalone tracks · no parent collection</p></div>
   {!data?.length&&<p>No standalone singles match this search. To turn a single into part of an EP, album or mixtape, open its details and add a collection name.</p>}
   <AdminReleaseViewToggle count={data?.length||0}>{(data||[]).map(row=><AdminReleaseRow key={row.id} release={row}/>)}</AdminReleaseViewToggle>
   <nav className="bulk-pagination" aria-label="Singles pagination">
    <Link aria-disabled={page<=1} href={url(kind,q,Math.max(1,page-1))}>← Previous</Link><span>Page {page} / {pages}</span>
    <Link aria-disabled={page>=pages} href={url(kind,q,Math.min(pages,page+1))}>Next →</Link>
   </nav>
  </main>;
 }
 let listing=admin.from("music_release_packages")
  .select("id,name,format,updated_at,music_releases(count)",{count:"exact"})
  .order("updated_at",{ascending:false}).order("id",{ascending:true});
 if(kind!=="all")listing=listing.eq("format",kind);
 if(q)listing=listing.ilike("name",`%${q}%`);
 const {data:packages,error,count}=await listing.range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
 if(error)throw Error("Release stacks could not be loaded. "+error.message);
 const pages=Math.max(1,Math.ceil((count||0)/PAGE_SIZE));
 return <main className="community-page fm-release-stack-page">{basics}
  <div className="fm-package-result-heading"><h2>{label(kind)}</h2><p>{count||0} collections · Open a stack to review its songs.</p></div>
  {!packages?.length&&<div className="fm-package-empty"><strong>No {label(kind).toLowerCase()} found.</strong><p>New collections appear automatically when music is uploaded. Existing collections can be assigned this type using the category selector in All collections.</p><Link href={url("all","",1)}>Browse all collections</Link></div>}
  <div className="fm-package-list">{(packages||[]).map((p:any)=>{
   const songs=Number(p.music_releases?.[0]?.count||0);
   const kindName=filters.find(x=>x.id===p.format)?.label||"Project";
   return <details className="fm-package-card" key={p.id}>
    <summary className="fm-package-card-summary">
     <span className="fm-package-monogram" aria-hidden="true">{p.format==="mixtape"?"MIX":p.format==="album"?"ALB":p.format==="project"?"PRJ":p.format.toUpperCase()}</span>
     <span className="fm-package-title"><strong>{p.name}</strong><small>{kindName} · {songs} track{songs===1?"":"s"}</small></span>
     <span className="fm-package-kind">{kindName}</span>
     <span className="fm-package-chevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="fm-package-card-body">
     <p>One collection, {songs} recording{songs===1?"":"s"}. The stack keeps each song's own ID, artwork, credits and moderation state.</p>
     <Link className="fm-package-open-link" href={"/admin/releases/packages/"+p.id}>Open tracks &amp; manage release →</Link>
     <AdminReleasePackageFormat id={p.id} format={p.format}/>
    </div>
   </details>;
  })}</div>
  <nav className="bulk-pagination" aria-label="Release stacks pagination">
   <Link aria-disabled={page<=1} href={url(kind,q,Math.max(1,page-1))}>← Previous</Link><span>Page {page} / {pages}</span>
   <Link aria-disabled={page>=pages} href={url(kind,q,Math.min(pages,page+1))}>Next →</Link>
  </nav>
  {kind==="all"&&(singleCount||0)>0&&<div className="fm-package-single-prompt">
   <span className="fm-package-monogram" aria-hidden="true">S</span>
   <div><strong>Standalone singles</strong><p>{singleCount} songs without a project, EP, album or mixtape.</p></div>
   <Link href={url("single","",1)}>Manage singles →</Link>
  </div>}
 </main>;
}
