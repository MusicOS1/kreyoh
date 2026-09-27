import Link from "next/link";
import AppShell from "../../components/AppShell";
import { getWorkspace } from "../../lib/workspace";
import { projectLink } from "../../lib/navigation";
const first=(value:any)=>Array.isArray(value)?value[0]:value;
export default async function MyActionsPage({searchParams}:{searchParams:Promise<{kind?:string}>}) {
  const {kind="tasks"}=await searchParams;
  const {admin,user,activeProjects}=await getWorkspace();
  const ids=activeProjects.map((p:any)=>p.id);
  const title=kind==="sessions"?"Upcoming project sessions":kind==="voting"?"Open voting rounds":"My open tasks";
  const emptyIds=["00000000-0000-0000-0000-000000000000"];
  const result=kind==="sessions" ? await admin.from("studio_sessions").select("id,project_id,starts_at,location,projects(name)").in("project_id",ids.length?ids:emptyIds).gte("starts_at",new Date().toISOString()).neq("status","cancelled").order("starts_at")
    :kind==="voting" ? await admin.from("track_voting_rounds").select("id,project_id,title,projects(name)").in("project_id",ids.length?ids:emptyIds).eq("status","open")
    :await admin.from("project_tasks").select("id,project_id,title,due_date,projects(name)").in("project_id",ids.length?ids:emptyIds).eq("assignee_id",user.id).neq("status","done").order("due_date",{nullsFirst:false});
  const target=kind==="sessions"?"/studio-sessions":kind==="voting"?"/tracks":"/tasks";
  return <AppShell><div className="content"><Link href="/home">← Home</Link><h1>{title}</h1><p>Across your active projects. Opening an item selects its project.</p>{result.error?<p role="alert">We couldn’t load this list. Please refresh.</p>:!result.data?.length?<p>Nothing pending here.</p>:result.data.map((item:any)=><article className="panel split-summary" key={item.id}><div><h2>{item.title || item.location || "Studio session"}</h2><p>{first(item.projects)?.name}{item.starts_at?` · ${new Date(item.starts_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi"})} EAT`:item.due_date?` · Due ${item.due_date}`:""}</p></div><Link href={projectLink(item.project_id,target)}>Open →</Link></article>)}</div></AppShell>;
}
