import { createAdminClient } from "../../../../lib/supabase/admin";
import { creatorDisplayName } from "../../../../lib/profileIdentity";

const first = (value: any) => Array.isArray(value) ? value[0] : value;

export default async function VotingIntelligencePage() {
  const admin = createAdminClient();
  const [projectsResult, roundsResult, membersResult, rankedResult, versionResult, tracksResult] = await Promise.all([
    admin.from("projects").select("id,code,name,status").order("created_at", { ascending: true }),
    admin.from("track_voting_rounds").select("id,project_id,title,status,results_visible,created_at").order("created_at", { ascending: false }),
    admin.from("project_members").select("project_id,user_id,status,profiles(full_name,stage_name)").eq("status", "active"),
    admin.from("track_rankings").select("round_id,project_id,track_id,user_id,points"),
    admin.from("track_version_rankings").select("round_id,project_id,track_id,user_id,points"),
    admin.from("tracks").select("id,working_title,track_code"),
  ]);
  const projects = projectsResult.data || []; const rounds = roundsResult.data || []; const members = membersResult.data || [];
  const rankings = [...(rankedResult.data || []), ...(versionResult.data || [])]; const tracks = tracksResult.data || [];
  const trackMap = new Map(tracks.map((track: any) => [track.id, track]));
  return <><section className="control-page-hero analytics"><span className="control-eyebrow">VOTING INTEGRITY</span><h1>Participation, without exposing private ballots.</h1><p>Eligible members, completed voters and people still awaiting follow-up. Existing vote records remain read-only here.</p></section>
    <section className="control-stack">{projects.map((project: any) => {
      const round = rounds.find((item: any) => item.project_id === project.id);
      const eligible = members.filter((item: any) => item.project_id === project.id);
      const roundRankings = round ? rankings.filter((item: any) => item.round_id === round.id) : [];
      const voters = new Set(roundRankings.map((item: any) => item.user_id));
      const voted = eligible.filter((item: any) => voters.has(item.user_id)); const awaiting = eligible.filter((item: any) => !voters.has(item.user_id));
      const totals = new Map<string, number>(); roundRankings.forEach((item: any) => totals.set(item.track_id, (totals.get(item.track_id) || 0) + Number(item.points || 0)));
      const chart = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
      return <article className="control-panel voting-intelligence-card" key={project.id}><header><div><span className="control-eyebrow">{project.code || "PROJECT"}</span><h2>{project.name}</h2><p>{round ? `${round.title} · ${round.status}` : "No voting round recorded"}</p></div><div className="control-project-code">{round?.results_visible ? "RESULTS VISIBLE" : "PRIVATE"}</div></header>
        <div className="control-metrics compact"><article><span>Eligible voters</span><strong>{eligible.length}</strong></article><article><span>Voted</span><strong>{voted.length}</strong></article><article><span>Awaiting vote</span><strong>{awaiting.length}</strong></article></div>
        <div className="control-grid"><section><h3>Voted</h3>{!voted.length && <p className="control-empty">No completed ballots yet.</p>}{voted.map((item: any) => <div className="control-row" key={item.user_id}><strong>{creatorDisplayName(first(item.profiles))}</strong><b>Done</b></div>)}</section><section><h3>Awaiting vote</h3>{!awaiting.length && <p className="control-empty">Everyone eligible has participated.</p>}{awaiting.map((item: any) => <div className="control-row" key={item.user_id}><strong>{creatorDisplayName(first(item.profiles))}</strong><b>Follow up</b></div>)}</section></div>
        <section><h3>Aggregate result</h3>{!chart.length && <p className="control-empty">No ranked points recorded for this round.</p>}{chart.map(([trackId, points], index) => { const track: any = trackMap.get(trackId); return <div className="control-row" key={trackId}><span className="control-project-code">{String(index + 1).padStart(2, "0")}</span><div><strong>{track?.working_title || track?.track_code || "Track"}</strong><small>Combined ranked points</small></div><b>{points}</b></div>; })}</section>
      </article>;
    })}</section></>;
}
