import AppShell from "../../components/AppShell";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { getWorkspace } from "../../lib/workspace";
import { isSuperAdmin } from "../../lib/controlRoom";
import {
  addClaimEvidence,
  createProfessionalClaim,
  requestClaimConfirmation,
  respondToCreditClaim,
  verifyProfessionalClaim,
} from "./actions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;
const statusLabel=(status:string)=>{
  const labels:Record<string,string>={
    self_claimed:"SELF CLAIMED",
    evidence_attached:"EVIDENCE ATTACHED",
    contributor_confirmed:"CONTRIBUTOR CONFIRMED",
    fackts_verified:"FACKTS VERIFIED",
    disputed:"DISPUTED",
    rejected:"REJECTED",
    withdrawn:"WITHDRAWN",
  };
  return labels[status]||String(status).replaceAll("_"," ").toUpperCase();
};

export default async function ProfessionalRecordPage(){
  const{admin,user,project}=await getWorkspace();
  const superAdmin=await isSuperAdmin(user.id);

  const[internalR,sessionR,claimsR,requestsR,membersR]=await Promise.all([
    admin.from("track_contributors").select("id,contribution_role,approved,tracks(id,working_title,track_code,project_id,projects(name,code))").eq("user_id",user.id),
    admin.from("session_contributions").select("id,contribution_type,description,created_at,tracks(working_title),studio_sessions(starts_at)").eq("contributor_id",user.id).order("created_at",{ascending:false}).limit(30),
    admin.from("professional_credit_claims").select("*,professional_credit_evidence(id,evidence_type,evidence_url,notes,created_at),professional_credit_confirmations(id,confirmer_id,response,note,requested_at,responded_at,profiles!professional_credit_confirmations_confirmer_id_fkey(full_name,stage_name,nickname))").eq("claimant_id",user.id).order("created_at",{ascending:false}),
    admin.from("professional_credit_confirmations").select("id,claim_id,response,note,requested_at,professional_credit_claims(work_title,primary_artist,contribution_role,claimant_id,profiles!professional_credit_claims_claimant_id_fkey(full_name,stage_name,nickname))").eq("confirmer_id",user.id).eq("response","requested").order("requested_at",{ascending:false}),
    project?admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).eq("status","active"):Promise.resolve({data:[]}),
  ]);

  const internal=internalR.data||[],sessions=sessionR.data||[],claims=claimsR.data||[],requests=requestsR.data||[],members=(membersR as any).data||[];
  const verifiedInternal=internal.filter((x:any)=>x.approved).length;
  const verifiedExternal=claims.filter((x:any)=>x.verification_status==="fackts_verified").length;
  const contributorConfirmed=claims.filter((x:any)=>x.verification_status==="contributor_confirmed").length;
  const pending=claims.filter((x:any)=>["self_claimed","evidence_attached"].includes(x.verification_status)).length;

  return<AppShell><style>{`
    .record-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 20px}
    .record-stats article{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.025)}
    .record-stats span{display:block;color:rgba(255,255,255,.4);font-size:9px;font-weight:850;text-transform:uppercase}
    .record-stats strong{display:block;margin-top:6px;font-size:20px}
    .verification-ladder{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .verification-ladder div{padding:12px;border:1px solid rgba(255,255,255,.07);border-radius:12px}
    .claim-card{display:grid;gap:12px}.claim-head{display:flex;justify-content:space-between;gap:14px}
    @media(max-width:800px){.record-stats,.verification-ladder{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){.record-stats,.verification-ladder{grid-template-columns:1fr}}
  `}</style><div className="content operations-page">
    <div className="heading"><div><span className="eyebrow">CREATOR RECORD / TRUST LAYER</span><h1>My Professional Record</h1><p>Build a credible record of what you actually produced, wrote, performed or engineered. Claims are never treated as verified facts just because you typed them.</p></div></div>

    <section className="record-stats">
      <article><span>FACKTS internal verified</span><strong>{verifiedInternal}</strong></article>
      <article><span>External FACKTS verified</span><strong>{verifiedExternal}</strong></article>
      <article><span>Contributor confirmed</span><strong>{contributorConfirmed}</strong></article>
      <article><span>Pending verification</span><strong>{pending}</strong></article>
    </section>

    <section className="panel">
      <span className="eyebrow">VERIFICATION LADDER</span><h2>How FACKTS protects professional records</h2>
      <div className="verification-ladder">
        <div><strong>1. Self Claimed</strong><p>You entered the credit. It is not presented as fact.</p></div>
        <div><strong>2. Evidence Attached</strong><p>Release, agreement, split sheet, session or distributor evidence exists.</p></div>
        <div><strong>3. Contributor Confirmed</strong><p>Another relevant FACKTS creator confirms the claim.</p></div>
        <div><strong>4. FACKTS Verified</strong><p>Evidence and confirmation have been reviewed. Disputed claims cannot receive this status.</p></div>
      </div>
    </section>

    <section className="platform-home-split">
      <article className="panel">
        <span className="eyebrow">INTERNAL FACKTS CREDITS</span><h2>Credits created inside projects</h2>
        {!internal.length&&<p>No internal track credits yet.</p>}
        <div className="home-list">{internal.map((credit:any)=>{const track=first(credit.tracks),proj=first(track?.projects);return<div key={credit.id}><time>{track?.track_code||"TRACK"}</time><span><strong>{track?.working_title||"Untitled track"}</strong><small>{String(credit.contribution_role).replaceAll("_"," ")} · {proj?.name||proj?.code||"FACKTS project"} · {credit.approved?"✓ FACKTS Verified":"Recorded — awaiting project verification"}</small></span></div>})}</div>
      </article>

      <article className="panel">
        <span className="eyebrow">STUDIO CONTRIBUTIONS</span><h2>What sessions say you did</h2>
        {!sessions.length&&<p>No recorded studio contributions.</p>}
        <div className="home-list">{sessions.map((credit:any)=><div key={credit.id}><time>{new Date(credit.created_at).toLocaleDateString("en-KE")}</time><span><strong>{String(credit.contribution_type).replaceAll("_"," ")}</strong><small>{first(credit.tracks)?.working_title||"Project session"} · {credit.description}</small></span></div>)}</div>
      </article>
    </section>

    <details className="beat-intake-disclosure" open>
      <summary className="beat-intake-summary"><span>EXTERNAL CREDIT</span><strong>Claim work created outside FACKTS</strong><small>It starts as Self Claimed. It will not appear as a verified fact until verification is completed.</small><b>Open +</b></summary>
      <form action={createProfessionalClaim} className="panel operations-form">
        <input name="work_title" required placeholder="Song / work title"/>
        <input name="primary_artist" placeholder="Primary artist / act"/>
        <input name="contribution_role" required placeholder="Producer, songwriter, mix engineer, performer…"/>
        <input name="source_url" type="url" placeholder="Public release / source link"/>
        <button>Create claim</button>
      </form>
    </details>

    {!!requests.length&&<section className="platform-home-section">
      <span className="eyebrow">CONFIRMATION REQUESTS</span><h2>Creators asking you to verify a credit</h2>
      <div className="project-card-grid">{requests.map((request:any)=>{const claim=first(request.professional_credit_claims),claimant=first(claim?.profiles);return<article className="project-operating-card" key={request.id}><span>PENDING CONFIRMATION</span><h3>{claim?.work_title}</h3><p>{creatorDisplayName(claimant)} says they were {claim?.contribution_role}{claim?.primary_artist?` on ${claim.primary_artist}`:""}.</p><form action={respondToCreditClaim} className="operations-form"><input type="hidden" name="confirmation_id" value={request.id}/><textarea name="note" placeholder="Optional context / correction"/><div><button name="response" value="confirmed">Confirm</button><button name="response" value="corrected">Needs correction</button><button name="response" value="disputed">Dispute</button></div></form></article>})}</div>
    </section>}

    <section className="platform-home-section">
      <span className="eyebrow">MY EXTERNAL CLAIMS</span><h2>Verification queue</h2>
      {!claims.length&&<p>No external credits claimed yet.</p>}
      <div className="project-card-grid">{claims.map((claim:any)=>{
        const evidence=claim.professional_credit_evidence||[],confirmations=claim.professional_credit_confirmations||[];
        const confirmed=confirmations.filter((x:any)=>x.response==="confirmed").length,disputed=confirmations.filter((x:any)=>x.response==="disputed").length;
        return<article className="project-operating-card claim-card" key={claim.id}>
          <div className="claim-head"><div><span>{statusLabel(claim.verification_status)}</span><h3>{claim.work_title}</h3><p>{claim.primary_artist||"Artist not listed"} · {claim.contribution_role}</p></div>{claim.verification_status==="fackts_verified"&&<b>✓ FACKTS VERIFIED</b>}</div>
          {claim.source_url&&<a href={claim.source_url} target="_blank" rel="noreferrer">Open source ↗</a>}
          <small>{evidence.length} evidence item{evidence.length===1?"":"s"} · {confirmed} confirmer{confirmed===1?"":"s"} · {disputed} dispute{disputed===1?"":"s"}</small>

          <details className="session-inline-tool"><summary>Add evidence +</summary><form action={addClaimEvidence} className="operations-form"><input type="hidden" name="claim_id" value={claim.id}/><select name="evidence_type" defaultValue="release_link"><option value="release_link">Release link</option><option value="isrc_upc">ISRC / UPC</option><option value="credits_page">Credits page</option><option value="agreement">Agreement</option><option value="split_sheet">Split sheet</option><option value="session_evidence">Session evidence</option><option value="project_file">Project file</option><option value="distributor_record">Distributor record</option><option value="other">Other</option></select><input name="evidence_url" type="url" placeholder="Evidence link"/><textarea name="notes" placeholder="Explain what this proves"/><button>Add evidence</button></form></details>

          {members.filter((m:any)=>m.user_id!==user.id).length>0&&<details className="session-inline-tool"><summary>Ask another creator to confirm +</summary><form action={requestClaimConfirmation} className="operations-form"><input type="hidden" name="claim_id" value={claim.id}/><select name="confirmer_id" required defaultValue=""><option value="" disabled>Choose relevant FACKTS creator</option>{members.filter((m:any)=>m.user_id!==user.id).map((m:any)=><option key={m.user_id} value={m.user_id}>{creatorDisplayName(first(m.profiles))}</option>)}</select><button>Request confirmation</button></form></details>}

          {confirmations.map((c:any)=><div key={c.id}><small>{creatorDisplayName(first(c.profiles))} · {String(c.response).replaceAll("_"," ")}</small>{c.note&&<p>{c.note}</p>}</div>)}

          {superAdmin&&claim.verification_status!=="fackts_verified"&&<details className="session-inline-tool"><summary>Super Admin verification +</summary><form action={verifyProfessionalClaim} className="operations-form"><input type="hidden" name="claim_id" value={claim.id}/><textarea name="verification_note" placeholder="Verification note"/><button>Issue FACKTS Verified</button></form></details>}
        </article>;
      })}</div>
    </section>
  </div></AppShell>;
}
