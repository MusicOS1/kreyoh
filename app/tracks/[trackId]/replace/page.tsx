import AppShell from "../../../../components/AppShell";
import TrackReplacementForm from "../../../../components/TrackReplacementForm";
import {getWorkspace,hasAnyRole} from "../../../../lib/workspace";
import {notFound} from "next/navigation";

export default async function ReplaceTrackPage({params}:{params:Promise<{trackId:string}>}){
  const{trackId}=await params;
  const{admin,project,membership,roles}=await getWorkspace();

  if(!project||!membership)return <AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;

  const allowed=hasAnyRole(roles,["Super Admin","Admin","Project Lead","A&R"]);
  if(!allowed)return <AppShell><div className="content empty-state"><h2>Replacement access unavailable</h2><p>Only project leadership can replace an incomplete track.</p></div></AppShell>;

  const[{data:track},{data:beats=[]},{data:openRound}]=await Promise.all([
    admin.from("tracks").select("id,working_title,beat_id,status,development_status,track_code").eq("id",trackId).eq("project_id",project.id).maybeSingle(),
    admin.from("beats").select("id,title,beat_code,producer_name").eq("project_id",project.id).order("created_at",{ascending:false}),
    admin.from("track_voting_rounds").select("id,status").eq("project_id",project.id).eq("status","open").limit(1).maybeSingle(),
  ]);

  if(!track)notFound();

  const locked=["release_ready","complete"].includes(track.development_status||track.status);

  return <AppShell><div className="content operations-page">
    <div className="heading"><div><span className="eyebrow">{project.code} / TRACK REPLACEMENT</span><h1>Replace {track.working_title||"incomplete track"}</h1><p>Use the same track record instead of creating another catalogue entry. Old audio remains as version history.</p></div><div className="date"><span>{track.track_code||"TRACK"}</span></div></div>

    {openRound&&<div className="form-error-alert">Replacement is locked because a voting round is currently open. This protects the ballot from changing while members are voting.</div>}
    {locked&&<div className="form-error-alert">This track is already release-ready or complete. Add a new version instead of replacing it.</div>}

    {!openRound&&!locked&&<TrackReplacementForm trackId={track.id} currentTitle={track.working_title||""} currentBeatId={track.beat_id||null} beats={(beats??[]) as any}/>}
  </div></AppShell>;
}
