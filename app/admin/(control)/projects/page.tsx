import Link from "next/link";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { requireControlRoomPermission } from "../../../../lib/controlRoom";

export default async function AdminProjects(){
  await requireControlRoomPermission("projects");
  const admin=createAdminClient();
  const {data:projects}=await admin.from("projects").select("id,code,name,description,status,artwork_url,hero_image_url,next_action,project_members(id,status),beats(id),tracks(id,status),studio_sessions(id),project_tasks(id,status)").order("created_at",{ascending:false});
  const safeProjects = projects ?? [];
  return <><section className="control-page-hero projects"><span className="control-eyebrow">PROJECT PORTFOLIO</span><h1>Every venture in view.</h1><p>Operate across the portfolio according to Super Admin permissions.</p></section>
  <section className="control-project-list">{safeProjects.map((p:any)=><article className="control-project-card" key={p.id}>
    <div>{p.artwork_url&&<img src={p.artwork_url} alt="" style={{width:"100%",aspectRatio:"16/6",objectFit:"cover",borderRadius:"14px",marginBottom:"14px"}}/>}<span>{p.code}</span><Link href={`/admin/projects/${p.id}`}><h2>{p.name}</h2></Link><p>{p.description||"No description yet."}</p>
    <div className="control-project-kpis"><small>{(p.project_members||[]).filter((m:any)=>m.status==="active").length} members</small><small>{p.beats?.length||0} beats</small><small>{p.tracks?.length||0} tracks</small><small>{p.studio_sessions?.length||0} sessions</small><small>{(p.project_tasks||[]).filter((t:any)=>t.status!=="done").length} open actions</small></div>
    <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"14px"}}><Link className="control-secondary-button" href={`/admin/projects/${p.id}`}>Manage Project</Link><a className="control-secondary-button" href={`/api/projects/${p.id}/report`}>Download Project Report</a></div></div>
  </article>)}</section></>;
}
