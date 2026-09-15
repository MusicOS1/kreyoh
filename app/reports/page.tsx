import Link from "next/link";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {canViewProjectFinanceReport} from "../../lib/financeAccess";

export default async function ReportsPage(){
  const{admin,project,membership,roles}=await getWorkspace();
  if(!project||!membership)return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;

  const[tracksR,issuesR,updatesR]=await Promise.all([
    admin.from("tracks").select("id").eq("project_id",project.id),
    admin.from("track_operational_issues").select("id,status").eq("project_id",project.id),
    admin.from("project_updates").select("id").eq("project_id",project.id),
  ]);

  const tracks=tracksR.data||[];
  const issues=issuesR.data||[];
  const canViewFinance=canViewProjectFinanceReport(roles);
  const openIssues=issues.filter((x:any)=>!["resolved","accepted_risk"].includes(x.status)).length;

  return<AppShell><div className="content operations-page">
    <div className="heading"><div><span className="eyebrow">{project.code} / REPORTING</span><h1>Project Reports</h1><p>Transparent project reporting for artists, A&R, managers, studio partners and project leadership.</p></div></div>

    <section className="finance-metrics">
      <article><span>Tracks</span><strong>{tracks.length}</strong></article>
      <article><span>Open issues</span><strong>{openIssues}</strong></article>
      <article><span>Project updates</span><strong>{updatesR.data?.length||0}</strong></article>
    </section>

    <section className="project-card-grid">
      {canViewFinance&&<article className="panel project-operating-card"><span>EXECUTIVE</span><h3>Executive Project Report</h3><p>People, music, execution, finance, commercial pathways and aggregate project reporting.</p><a className="login-submit-btn" href={`/api/projects/${project.id}/report`}>Download PDF ↓</a></article>}
      <article className="panel project-operating-card"><span>MUSIC</span><h3>Track Records</h3><p>Track-by-track credits, rights, files, spend, release outcomes and issues.</p><Link href="/track-records">Open Track Records →</Link></article>
      {canViewFinance&&<article className="panel project-operating-card"><span>ECONOMICS</span><h3>Finance</h3><p>Cash collected, expenses, opportunity revenue and the read-only payment audit trail.</p><Link href="/finance">Open Financial Report →</Link></article>}
      <article className="panel project-operating-card"><span>COMMERCIAL</span><h3>Opportunities</h3><p>Pipeline, pitches, negotiations, commercial value and follow-up.</p><Link href="/opportunities">Open Opportunities →</Link></article>
      <article className="panel project-operating-card"><span>HISTORY</span><h3>Activity & Updates</h3><p>Who did what, what changed and what the project communicated.</p><Link href="/activity">Open Activity →</Link></article>
    </section>
  </div></AppShell>;
}
