import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {saveCatalogueAttribution} from "./actions";
import "./catalogue.css";

export const dynamic="force-dynamic";
export default async function CatalogueAttribution({searchParams}:{searchParams:Promise<{q?:string;error?:string;saved?:string}>}){
 await requireControlRoomPermission("music");
 const params=await searchParams;
 const query=String(params.q||"").trim().replace(/[,%()]/g," ").slice(0,70);
 const admin=createAdminClient();
 let releasesQuery=admin.from("music_releases").select("id,title,artist_name,status,created_at").order("created_at",{ascending:false}).limit(80);
 let tracksQuery=admin.from("tracks").select("id,working_title,project_id,created_at").order("created_at",{ascending:false}).limit(80);
 if(query){
  releasesQuery=releasesQuery.ilike("title","%"+query+"%");
  tracksQuery=tracksQuery.ilike("working_title","%"+query+"%");
 }
 const [releasesResult,tracksResult,peopleResult,recordedResult]=await Promise.all([
  releasesQuery,tracksQuery,
  admin.from("profiles").select("id,stage_name,full_name,email,creator_types").order("full_name",{ascending:true}).limit(400),
  admin.from("music_catalogue_attributions").select("id,release_id,track_id,upload_origin,credited_artist_name,ownership_kind,rights_holder_name,verification_state,updated_at").order("updated_at",{ascending:false}).limit(60)
 ]);
 const releases=releasesResult.data||[];
 const tracks=tracksResult.data||[];
 const people=peopleResult.data||[];
 const artists=people.filter(p=>p.creator_types?.includes("Artist"));
 const registered=recordedResult.data||[];
 const schemaReady=!recordedResult.error;
 return <main className="community-page fm-catalogue-attribution">
  <div className="community-actions"><Link href="/admin/releases">← Releases</Link><Link href="/tracks">Project demos</Link><Link href="/production">Production workspace</Link></div>
  <span className="eyebrow">FACKTS MUSIC · CATALOGUE GOVERNANCE</span>
  <h1>Catalogue attribution</h1>
  <p>Identify the uploader, credited artist and rights holder for an existing demo or release. These are different responsibilities.</p>
  {params.saved&&<p className="fm-catalogue-success" role="status">Attribution saved. No audio, votes, comments, credits, split sheets or public listings were modified.</p>}
  {params.error&&<p className="form-error-alert" role="alert">{params.error}</p>}
  {!schemaReady&&<p className="form-error-alert" role="alert">The attribution register needs the new database migration before records can be saved. Existing songs and project demos are still available.</p>}
  <div className="fm-catalogue-paths">
   <section><strong>PROJECT DEMO</strong><p>Private working tracks, stems, versions and sound-design files live in their project. Artist and admin uploads use existing authorised project production controls.</p><Link href="/tracks">Open project tracks ↗</Link></section>
   <section><strong>PUBLIC RELEASE</strong><p>A verified finished master enters the release-approval workflow. It becomes discoverable by fans only when published. Admins can add releases without becoming the credited artist.</p><Link href="/admin/releases/bulk">Add new release ↗</Link></section>
  </div>
  <form method="get" action="/admin/catalogue" className="fm-catalogue-search"><label htmlFor="catalogue-q">Find a recording</label><input id="catalogue-q" name="q" defaultValue={query} placeholder="Search working titles and release titles"/><button type="submit">Search</button></form>
  <section className="community-card fm-catalogue-form">
   <h2>Recording details</h2>
   <p>Select a recording, then enter what is known. Leave historical ownership unverified until the supporting agreement is available.</p>
   <form action={saveCatalogueAttribution}>
    <label>Recording
     <select name="source" required defaultValue="">
      <option value="" disabled>Select a demo or public release</option>
      <optgroup label="Project demos / working tracks">
       {tracks.map(track=><option key={track.id} value={"demo:"+track.id}>{track.working_title||"Untitled demo"} · Project {track.project_id.slice(0,8)}</option>)}
      </optgroup>
      <optgroup label="Catalogue releases">
       {releases.map(release=><option key={release.id} value={"release:"+release.id}>{release.title} — {release.artist_name} ({release.status})</option>)}
      </optgroup>
     </select>
    </label>
    <div className="fm-catalogue-two">
     <label>Uploaded through
      <select name="upload_origin" defaultValue="unknown" required>
       <option value="unknown">Unknown / not verified</option>
       <option value="artist_upload">Artist or professional account</option>
       <option value="admin_upload">FACKTS administrator</option>
      </select>
     </label>
     <label>Uploader account (if verified)
      <select name="uploaded_by_profile_id" defaultValue="">
       <option value="">Not linked</option>
       {people.map(p=><option key={p.id} value={p.id}>{p.stage_name||p.full_name||p.email||p.id}</option>)}
      </select>
     </label>
    </div>
    <div className="fm-catalogue-two">
     <label>Credited performing artist / group
      <input name="credited_artist_name" maxLength={130} placeholder="Public artist credit; may be a collective"/>
     </label>
     <label>Link to official Artist account
      <select name="credited_artist_profile_id" defaultValue="">
       <option value="">Not yet linked</option>
       {artists.map(p=><option key={p.id} value={p.id}>{p.stage_name||p.full_name||p.email||p.id}</option>)}
      </select>
     </label>
    </div>
    <label>Artist credit evidence (optional)
      <input name="credit_evidence_reference" maxLength={350} placeholder="Approval record or signed performer credit"/>
      <small>A linked artist appears on their profile only when the credit and evidence are supplied. This does not establish ownership.</small>
    </label>
    <div className="fm-catalogue-two">
     <label>Recording / master rights
      <select name="ownership_kind" defaultValue="unverified" required>
       <option value="unverified">Not yet verified</option>
       <option value="artist">Artist-owned</option>
       <option value="company">Company-owned</option>
       <option value="third_party">External rights holder</option>
       <option value="shared">Shared ownership</option>
      </select>
     </label>
     <label>Rights holder legal or trading name
      <input name="rights_holder_name" maxLength={150} placeholder="Only state the actual documented rights holder"/>
     </label>
    </div>
    <div className="fm-catalogue-two">
     <label>Verification
      <select name="verification_state" defaultValue="needs_review" required>
       <option value="needs_review">Needs review</option>
       <option value="verified">Verified against rights evidence</option>
      </select>
     </label>
     <label>Agreement / evidence reference
      <input name="rights_evidence_reference" maxLength={350} placeholder="Document ID, signed agreement or stored evidence reference"/>
     </label>
    </div>
    <label>Attribution notes
     <textarea name="attribution_note" maxLength={1000} placeholder="Identify any unresolved credits, licences or disputed ownership. Do not add private notes to the public song page."/>
    </label>
    <button type="submit" disabled={!schemaReady}>Save attribution without changing the recording</button>
   </form>
  </section>
  <section className="community-card">
   <h2>Latest recorded attributions</h2>
   <div className="fm-catalogue-records">{registered.length?registered.map(item=><article key={item.id}>
    <strong>{item.release_id?"Release":"Project demo"}</strong>
    <span>{item.credited_artist_name||"Artist credit not yet linked"}</span>
    <span>{item.upload_origin==="unknown"?"Uploader not confirmed":item.upload_origin==="admin_upload"?"Admin upload":"Artist / creative upload"}</span>
    <span>{item.ownership_kind==="unverified"?"Rights unverified":item.ownership_kind+" · "+(item.rights_holder_name||"Holder not specified")}</span>
    <small>{item.verification_state==="verified"?"Rights verified":"Rights need review"}</small>
   </article>):<p>No attribution reviews recorded yet. Existing catalogue data has not been altered.</p>}</div>
  </section>
 </main>;
}
