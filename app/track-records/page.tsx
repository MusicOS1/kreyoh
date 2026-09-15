import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";

const first=(v:any)=>Array.isArray(v)?v[0]:v;

export default async function TrackRecordsPage(){
  const{admin,project,membership}=await getWorkspace();
  if(!project||!membership)return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;

  const[tracksR,splitsR,assetsR,issuesR,releasesR,rightsR]=await Promise.all([
    admin.from("tracks").select("id,working_title,track_code,status,development_status,beat_id,beats(title,producer_name)").eq("project_id",project.id).order("created_at",{ascending:false}),
    admin.from("track_splits").select("track_id,percentage,status").eq("project_id",project.id),
    admin.from("project_assets").select("entity_id,asset_kind").eq("project_id",project.id).eq("entity_type","track"),
    admin.from("track_operational_issues").select("track_id,status,severity").eq("project_id",project.id),
    admin.from("track_release_records").select("track_id,release_status").eq("project_id",project.id),
    admin.from("track_rights_checks").select("track_id,status").eq("project_id",project.id),
  ]);

  const tracks=tracksR.data||[],splits=splitsR.data||[],assets=assetsR.data||[],issues=issuesR.data||[],releases=releasesR.data||[],rights=rightsR.data||[];

  return<AppShell><style>{`
    .record-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .record-card{display:flex;flex-direction:column;gap:14px}
    .record-card header{display:flex;justify-content:space-between;gap:16px}
    .record-card h2{margin:4px 0 0}
    .record-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .record-facts span{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px}
    .record-facts small{display:block;color:rgba(255,255,255,.4);font-size:9px;text-transform:uppercase;letter-spacing:.05em}
    .record-facts strong{display:block;margin-top:5px;font-size:12px}
    @media(max-width:1050px){.record-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:700px){.record-grid{grid-template-columns:1fr}}
  `}</style><div className="content operations-page">
    <div className="heading"><div><span className="eyebrow">{project.code} / TRACK INTELLIGENCE</span><h1>Track Records</h1><p>Open one song and see the people, files, rights, spend, stage, release history, commercial outcomes and lessons behind it.</p></div><div className="date"><span>{tracks.length} TRACK RECORDS</span></div></div>

    <section className="record-grid">{tracks.map((track:any)=>{
      const ts=splits.filter((x:any)=>x.track_id===track.id),splitTotal=ts.reduce((s:number,x:any)=>s+Number(x.percentage||0),0);
      const confirmed=splitTotal===100&&ts.length>0&&ts.every((x:any)=>x.status==="confirmed");
      const fileCount=assets.filter((x:any)=>x.entity_id===track.id).length;
      const openIssues=issues.filter((x:any)=>x.track_id===track.id&&!["resolved","accepted_risk"].includes(x.status)).length;
      const live=releases.some((x:any)=>x.track_id===track.id&&x.release_status==="live");
      const tr=rights.filter((x:any)=>x.track_id===track.id),blocked=tr.some((x:any)=>x.status==="blocked");
      const beat=first(track.beats);
      return<article className="panel record-card" key={track.id}>
        <header><div><span className="eyebrow">{track.track_code||"TRACK"}</span><h2>{track.working_title||"Untitled track"}</h2><p>{beat?.title?`${beat.title}${beat.producer_name?` · ${beat.producer_name}`:""}`:"Original / source beat not linked"}</p></div><span className={`status-pill ${track.development_status||track.status}`}>{String(track.development_status||track.status||"in development").replaceAll("_"," ")}</span></header>
        <div className="record-facts">
          <span><small>Files</small><strong>{fileCount}</strong></span>
          <span><small>Splits</small><strong>{splitTotal}% {confirmed?"confirmed":"in progress"}</strong></span>
          <span><small>Rights</small><strong>{blocked?"Blocked":tr.length?"In review":"Not checked"}</strong></span>
          <span><small>Open Issues</small><strong>{openIssues}</strong></span>
          <span><small>Release</small><strong>{live?"Live":"Not live"}</strong></span>
          <span><small>Record</small><strong>{confirmed&&!blocked?"Developing":"Needs attention"}</strong></span>
        </div>
        <Link className="secondary-button-inline" href={`/track-records/${track.id}`}>Open Track Passport →</Link>
      </article>
    })}</section>
  </div></AppShell>;
}
