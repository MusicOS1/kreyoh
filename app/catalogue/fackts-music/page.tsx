import Link from "next/link";
import {createAdminClient} from "../../../lib/supabase/admin";
import PublicNavigation from "../../../components/PublicNavigation";
import PublicFooter from "../../../components/PublicFooter";
import "../../streaming-public.css";

export const dynamic="force-dynamic";
const PAGE_SIZE=24;
export const metadata={
 title:"FACKTS Music · Admin-Managed Catalogue",
 description:"Music presented and administered by FACKTS Music, with verified performer and contributor credits issued separately."
};
export default async function FacktsCatalogue({searchParams}:{searchParams:Promise<{page?:string}>}){
 const requested=Number.parseInt((await searchParams).page||"1",10);
 const page=Math.min(50000,Math.max(1,Number.isFinite(requested)?requested:1));
 const {data:releases=[],count,error}=await createAdminClient().from("music_releases")
  .select("id,title,artist_name,collection,track_number,genre,cover_key,release_at",{count:"exact"})
  .eq("status","published").eq("is_platform_managed",true)
  .lte("release_at",new Date().toISOString())
  .order("release_at",{ascending:false}).order("id")
  .range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
 if(error)throw new Error("Catalogue is temporarily unavailable.");
 const pages=Math.max(1,Math.ceil((count||0)/PAGE_SIZE));
 return <><PublicNavigation/><main className="public-site fm-v3-site fm-creators-page">
   <section className="fm-directory-hero">
    <div className="fm-v3-kicker">FACKTS MUSIC · CATALOGUE</div>
    <h1>Music entrusted to FACKTS.</h1>
    <p>FACKTS Music publishes and administers these recordings. The platform is a custodian, not automatically the performing artist or rights holder. Creators can claim their genuine credits and have them independently reviewed.</p>
    <p>{count||0} published recordings</p>
   </section>
   <section className="fm-directory-grid">
    {(releases||[]).map((song:any)=><article className="fm-directory-card" key={song.id}>
      <Link href={"/billboard/"+song.id} className="fm-directory-photo">
       {song.cover_key?<img src={"/api/releases/"+song.id+"/media?kind=cover"} alt={song.title+" cover"}/>:<span>♫</span>}
      </Link>
      <div className="fm-directory-copy">
       <span>{song.collection||"Single"}</span>
       <h2><Link href={"/billboard/"+song.id}>{song.title}</Link></h2>
       <p>{song.genre||"Independent music"} · Track {song.track_number||1}</p>
       <p>Catalogue administered by FACKTS Music</p>
       <Link href={"/billboard/"+song.id}>Listen · View credits</Link>
      </div>
     </article>)}
    {!releases?.length&&<p>No published catalogue recordings available yet.</p>}
   </section>
   <nav className="fm-directory-pagination" aria-label="Catalogue pagination">
    {page>1&&<Link href={`/catalogue/fackts-music?page=${page-1}`}>Previous</Link>}
    <span>Page {page} / {pages}</span>
    {page<pages&&<Link href={`/catalogue/fackts-music?page=${page+1}`}>Next</Link>}
   </nav>
 </main><PublicFooter/></>;
}
