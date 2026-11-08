import Link from "next/link";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {requireControlRoomPermission,isSuperAdmin} from "../../../../../lib/controlRoom";
import {verifyProfessionalClaim} from "../../../../professional-record/actions";
import {rejectCatalogueClaim} from "./actions";

export const dynamic="force-dynamic";
export default async function CatalogueClaims({searchParams}:{searchParams:Promise<{page?:string}>}){
 const actor=await requireControlRoomPermission("music");
 const canVerify=await isSuperAdmin(actor.id);
 const page=Math.min(5000,Math.max(1,Number.parseInt((await searchParams).page||"1",10)||1));
 const pageSize=30;
 const admin=createAdminClient();
 const {data:claims,error,count}=await admin.from("professional_credit_claims")
  .select("id,claimant_id,release_id,work_title,primary_artist,contribution_role,verification_status,verification_note,created_at,professional_credit_evidence(id,evidence_type,evidence_url,notes),professional_credit_confirmations(id,response,note),profiles!professional_credit_claims_claimant_id_fkey(full_name,stage_name,email)",{count:"exact"})
  .not("release_id","is",null).order("created_at",{ascending:false})
  .range((page-1)*pageSize,page*pageSize-1);
 if(error)throw new Error("Credit claims queue cannot be loaded.");
 const pages=Math.max(1,Math.ceil((count||0)/pageSize));
 return <main className="community-page">
  <div className="community-actions"><Link href="/admin/catalogue">← Catalogue governance</Link><Link href="/admin/releases">Releases</Link></div>
  <span className="eyebrow">FACKTS MUSIC · CREDIT VERIFICATION</span><h1>Artist & collaborator claims</h1>
  <p>Review the evidence behind each claimed performance or contribution. Uploading a song is not proof of being its artist. Approving a credit does not change rights ownership, splits, payouts or access to the project.</p>
  <p>{count||0} claims · Page {page} of {pages}. Only Super Admins can issue the FACKTS Verified status; evidence and an independent contributor confirmation are required.</p>
  {!claims?.length&&<p>No FACKTS catalogue credit claims have been submitted yet.</p>}
  <div className="project-card-grid">{(claims||[]).map((claim:any)=>{
   const person=Array.isArray(claim.profiles)?claim.profiles[0]:claim.profiles;
   const evidence=claim.professional_credit_evidence||[],confirmations=claim.professional_credit_confirmations||[];
   const confirmed=confirmations.filter((x:any)=>x.response==="confirmed").length;
   const disputed=confirmations.some((x:any)=>x.response==="disputed")||claim.verification_status==="disputed";
   const ready=canVerify&&evidence.length>0&&confirmed>0&&!disputed&&!["rejected","withdrawn","fackts_verified"].includes(claim.verification_status);
   return <article className="panel" key={claim.id}>
    <span className="eyebrow">{claim.verification_status.replaceAll("_"," ")}</span>
    <h2>{claim.work_title}</h2>
    <p><strong>{claim.contribution_role}</strong> · Claimed by {person?.stage_name||person?.full_name||claim.claimant_id}</p>
    <p>{person?.email||""} · {new Date(claim.created_at).toLocaleDateString("en-KE")}</p>
    <p><Link href={"/billboard/"+claim.release_id}>Review published recording</Link></p>
    <strong>Evidence ({evidence.length})</strong>
    {!evidence.length&&<p>No evidence submitted.</p>}
    {evidence.map((item:any)=><p key={item.id}>{item.evidence_type} · {item.notes||"No notes"}
     {typeof item.evidence_url==="string"&&/^https:\/\//i.test(item.evidence_url)&&<a href={item.evidence_url} target="_blank" rel="noopener noreferrer"> Open evidence</a>}</p>)}
    <p>Independent confirmations: {confirmed} · Disputed: {disputed?"Yes":"No"}</p>
    {claim.verification_note&&<p>Review notes: {claim.verification_note}</p>}
    {ready&&<form action={verifyProfessionalClaim} className="operations-form">
     <input type="hidden" name="claim_id" value={claim.id}/>
     <textarea name="verification_note" required minLength={20} placeholder="Why is this credit verified? Describe the evidence and collaborator confirmation."/>
     <button>Approve verified credit</button>
    </form>}
    {!ready&&claim.verification_status!=="fackts_verified"&&<p>Verification blocked until evidence, independent confirmation and Super Admin approval are present.</p>}
    {!["fackts_verified","withdrawn","rejected"].includes(claim.verification_status)&&<form action={rejectCatalogueClaim} className="operations-form">
     <input type="hidden" name="claim_id" value={claim.id}/>
     <textarea name="review_note" minLength={20} required placeholder="Specific reason (required, at least 20 characters)"/>
     <button>Reject claim with reason</button>
    </form>}
   </article>;
  })}</div>
  <nav className="bulk-pagination" aria-label="Credit claim pages">
   {page>1&&<Link href={`/admin/catalogue/claims?page=${page-1}`}>Previous</Link>}
   <span>Page {page} / {pages}</span>
   {page<pages&&<Link href={`/admin/catalogue/claims?page=${page+1}`}>Next</Link>}
  </nav>
 </main>;
}
