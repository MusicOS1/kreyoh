import AppShell from "../../components/AppShell";
import { creatorDisplayName } from "../../lib/profileIdentity";
import { getWorkspace, hasAnyRole } from "../../lib/workspace";
import {
  confirmOwnSplit,
  requestSplitChange,
  saveTrackSplit,
  sendTrackSplitsForConfirmation,
} from "./actions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;

export default async function SplitsPage(){
  const{admin,user,project,membership,roles}=await getWorkspace();
  if(!project||!membership)return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;

  const[tracksResult,membersResult,splitsResult,contributorsResult]=await Promise.all([
    admin.from("tracks").select("id,working_title,track_code,development_status,status").eq("project_id",project.id).order("working_title"),
    admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).eq("status","active"),
    admin.from("track_splits").select("id,track_id,contributor_id,contribution_role,percentage,status,confirmed_at,profiles(full_name,stage_name,nickname)").eq("project_id",project.id).order("created_at"),
    admin.from("track_contributors").select("track_id,user_id,contribution_role,profiles(full_name,stage_name,nickname),tracks!inner(project_id)").eq("tracks.project_id",project.id),
  ]);

  const tracks=tracksResult.data||[];
  const members=membersResult.data||[];
  const splits=splitsResult.data||[];
  const contributors=contributorsResult.data||[];
  const canManage=hasAnyRole(roles,["Super Admin","Admin","Project Lead"]);

  const awaitingMine=splits.filter((row:any)=>row.contributor_id===user.id&&row.status==="awaiting_confirmation");

  return<AppShell>
    <style>{`
      .split-explainer{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 24px}
      .split-explainer article{padding:16px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .split-explainer b{display:block;color:#ff9a46;font-size:10px}.split-explainer strong{display:block;margin:7px 0;font-size:13px}.split-explainer p{margin:0;color:rgba(255,255,255,.45);font-size:10px;line-height:1.5}
      .split-action-banner{margin:0 0 18px;padding:16px 18px;border:1px solid rgba(249,115,22,.28);border-radius:14px;background:rgba(249,115,22,.06)}
      .split-track-list{display:grid;gap:14px}
      .split-track-card{display:grid;gap:16px}
      .split-track-card>header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      .split-progress{min-width:150px;text-align:right}.split-progress strong{display:block;font-size:28px}.split-progress small{color:rgba(255,255,255,.42)}
      .split-step-line{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .split-step{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px}.split-step small{display:block;color:rgba(255,255,255,.4);font-size:8px;text-transform:uppercase}.split-step strong{display:block;margin-top:4px;font-size:11px}
      .split-member-row{display:grid;grid-template-columns:minmax(160px,1.5fr) minmax(120px,1fr) auto auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      .split-member-row small{display:block;color:rgba(255,255,255,.42)}.split-member-row em{font-style:normal;font-size:9px;text-transform:uppercase;color:rgba(255,255,255,.55)}
      .split-manage-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .split-send{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px dashed rgba(255,255,255,.1);border-radius:12px}
      .split-help{padding:13px 15px;border-left:3px solid #ff8a1f;background:rgba(255,138,31,.045);color:rgba(255,255,255,.62);font-size:11px;line-height:1.55}
      @media(max-width:900px){.split-explainer{grid-template-columns:repeat(2,minmax(0,1fr))}.split-member-row{grid-template-columns:1fr 1fr}.split-manage-grid{grid-template-columns:1fr}}
      @media(max-width:620px){.split-explainer{grid-template-columns:1fr}.split-track-card>header{flex-direction:column}.split-progress{text-align:left}.split-step-line{grid-template-columns:1fr}.split-member-row{grid-template-columns:1fr}}
    `}</style>

    <div className="content operations-page">
      <div className="heading">
        <div>
          <span className="eyebrow">{project.code} / RIGHTS</span>
          <h1>Splits & Credits</h1>
          <p>A split is the agreed ownership percentage of a song. FACKTS only treats a split plan as complete when it totals 100% and every contributor has confirmed their own share.</p>
        </div>
      </div>

      <section className="split-explainer">
        <article><b>STEP 1</b><strong>Draft the ownership</strong><p>Project leadership records who owns what percentage and why.</p></article>
        <article><b>STEP 2</b><strong>Reach exactly 100%</strong><p>The plan cannot be sent while money/ownership is still unallocated or over-allocated.</p></article>
        <article><b>STEP 3</b><strong>Send for confirmation</strong><p>Each contributor receives their own percentage to review. Nobody confirms on behalf of someone else.</p></article>
        <article><b>STEP 4</b><strong>All contributors confirm</strong><p>Only then does the track become 100% confirmed. Credits and ownership remain separate concepts.</p></article>
      </section>

      {!!awaitingMine.length&&<section className="split-action-banner">
        <strong>You have {awaitingMine.length} split confirmation{awaitingMine.length===1?"":"s"} waiting.</strong>
        <p>Review the percentage shown on the relevant track below. Confirm it if correct, or request a change with a reason.</p>
      </section>}

      <div className="split-help">
        <strong>Example:</strong> Producer 25% + Writer A 35% + Writer B 40% = 100%. Recording a person as a producer/writer credit does <b>not</b> automatically give them a split. The percentage must be explicitly agreed and confirmed.
      </div>

      <section className="split-track-list">
        {!tracks.length&&<div className="panel empty-state"><h2>No tracks yet</h2><p>Splits become available once tracks exist in the project.</p></div>}

        {tracks.map((track:any)=>{
          const rows=splits.filter((split:any)=>split.track_id===track.id);
          const total=rows.reduce((sum:number,row:any)=>sum+Number(row.percentage||0),0);
          const confirmedCount=rows.filter((row:any)=>row.status==="confirmed").length;
          const awaitingCount=rows.filter((row:any)=>row.status==="awaiting_confirmation").length;
          const allConfirmed=Math.abs(total-100)<=0.001&&rows.length>0&&rows.every((row:any)=>row.status==="confirmed");
          const remaining=Math.max(0,100-total);
          const recordedContributors=contributors.filter((c:any)=>c.track_id===track.id);

          return<article className="panel split-track-card" key={track.id}>
            <header>
              <div><span className="eyebrow">{track.track_code||"TRACK"}</span><h2>{track.working_title||"Untitled track"}</h2><p>Stage: {String(track.development_status||track.status||"in development").replaceAll("_"," ")}</p></div>
              <div className="split-progress"><strong>{total.toFixed(total%1===0?0:2)}%</strong><small>{allConfirmed?"100% confirmed":remaining>0?`${remaining.toFixed(remaining%1===0?0:2)}% still unallocated`:"Awaiting confirmation"}</small></div>
            </header>

            <div className="split-step-line">
              <div className="split-step"><small>Allocation</small><strong>{total===100?"100% allocated":`${total}% allocated`}</strong></div>
              <div className="split-step"><small>Confirmation</small><strong>{confirmedCount} of {rows.length} confirmed</strong></div>
              <div className="split-step"><small>Status</small><strong>{allConfirmed?"Rights split complete":awaitingCount?"Waiting on contributors":"Draft / incomplete"}</strong></div>
            </div>

            {!!recordedContributors.length&&<div>
              <span className="eyebrow">RECORDED TRACK CONTRIBUTORS</span>
              <p>{recordedContributors.map((c:any)=>`${creatorDisplayName(first(c.profiles))} (${String(c.contribution_role).replaceAll("_"," ")})`).join(" · ")}</p>
            </div>}

            <div>
              <span className="eyebrow">OWNERSHIP PLAN</span>
              {!rows.length&&<p>No ownership percentages have been drafted yet.</p>}
              {rows.map((row:any)=><div className="split-member-row" key={row.id}>
                <span><strong>{creatorDisplayName(first(row.profiles))}</strong><small>{row.contribution_role}</small></span>
                <b>{row.percentage}%</b>
                <em>{String(row.status).replaceAll("_"," ")}</em>
                <span>
                  {row.contributor_id===user.id&&row.status==="awaiting_confirmation"&&<>
                    <form action={confirmOwnSplit} style={{display:"inline"}}><input type="hidden" name="split_id" value={row.id}/><button>Confirm my {row.percentage}%</button></form>
                    <details className="session-inline-tool"><summary>Request change</summary><form action={requestSplitChange} className="operations-form"><input type="hidden" name="split_id" value={row.id}/><textarea name="reason" required placeholder="What percentage/role is wrong and why?"/><button>Send change request</button></form></details>
                  </>}
                  {row.contributor_id===user.id&&row.status==="confirmed"&&<strong>✓ You confirmed</strong>}
                </span>
              </div>)}
            </div>

            {canManage&&<details className="beat-intake-disclosure">
              <summary className="beat-intake-summary"><span>MANAGE SPLIT</span><strong>Add or revise an allocation</strong><small>Saving a change returns that person's row to Draft. Send the complete 100% plan afterwards.</small><b>Open +</b></summary>
              <form action={saveTrackSplit} className="panel operations-form split-manage-grid">
                <input type="hidden" name="track_id" value={track.id}/>
                <label>Contributor<select name="contributor_id" required defaultValue=""><option value="" disabled>Choose contributor</option>{members.map((member:any)=><option key={member.user_id} value={member.user_id}>{creatorDisplayName(first(member.profiles))}</option>)}</select></label>
                <label>Rights role<input name="contribution_role" required placeholder="Writer, composer, producer…"/></label>
                <label>Ownership %<input name="percentage" type="number" min="0" max="100" step="0.01" required placeholder="e.g. 25"/></label>
                <button>Save Draft Allocation</button>
              </form>
            </details>}

            {canManage&&<div className="split-send">
              <span><strong>Ready to send?</strong><small>{Math.abs(total-100)<=0.001&&rows.length?`The plan totals 100%. Sending it will ask all ${new Set(rows.map((r:any)=>r.contributor_id)).size} contributor(s) to confirm.`:`Finish the plan first. It must total exactly 100%.`}</small></span>
              <form action={sendTrackSplitsForConfirmation}><input type="hidden" name="track_id" value={track.id}/><button disabled={Math.abs(total-100)>0.001||!rows.length}>Send 100% Plan for Confirmation</button></form>
            </div>}
          </article>
        })}
      </section>
    </div>
  </AppShell>;
}
