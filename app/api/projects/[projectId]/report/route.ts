import {createClient} from "../../../../../lib/supabase/server";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {getControlRoomPermissions} from "../../../../../lib/controlRoom";
import {buildExecutiveProjectPdf} from "../../../../../lib/executiveProjectPdf";
const first=(v:any)=>Array.isArray(v)?v[0]:v;
const isMembershipRevenue=(item:any)=>{const source=String(item.revenue_source||"").toLowerCase();return ["membership","member fee","member fees","membership fee","membership fees","contribution","contributions","member contribution","member contributions"].some(term=>source.includes(term));};
const money=(rows:any[],field:string)=>{const m=new Map<string,number>();rows.forEach(r=>m.set(r.currency||"KES",(m.get(r.currency||"KES")||0)+Number(r[field]||0)));return [...m.entries()].map(([c,a])=>`${c} ${a.toLocaleString("en-KE")}`)};

export async function GET(_r:Request,{params}:{params:Promise<{projectId:string}>}){
 const{projectId}=await params,supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return new Response("Authentication required.",{status:401});
 const admin=createAdminClient();const[{data:membership},permissions]=await Promise.all([admin.from("project_members").select("id").eq("project_id",projectId).eq("user_id",user.id).eq("status","active").maybeSingle(),getControlRoomPermissions(user.id)]);
 if(!membership&&!permissions.includes("all")&&!permissions.includes("reports")&&!permissions.includes("projects"))return new Response("Report access unavailable.",{status:403});

 const[pR,mR,bR,tR,sR,taskR,roundR,oR,rR,budgetR,eR,feeR,pledgeR]=await Promise.all([
  admin.from("projects").select("id,code,name,description,status,project_type,next_action,start_date,target_release_date").eq("id",projectId).maybeSingle(),
  admin.from("project_members").select("id,user_id,profiles(full_name,stage_name),member_roles(roles(name))").eq("project_id",projectId).eq("status","active"),
  admin.from("beats").select("id,title,status").eq("project_id",projectId),
  admin.from("tracks").select("id,working_title,status,development_status").eq("project_id",projectId),
  admin.from("studio_sessions").select("id,status,starts_at").eq("project_id",projectId),
  admin.from("project_tasks").select("id,title,status,due_date,profiles!project_tasks_assignee_id_fkey(full_name,stage_name)").eq("project_id",projectId),
  admin.from("track_voting_rounds").select("id,status,results_visible,closes_at").eq("project_id",projectId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  admin.from("commercial_opportunities").select("id,status,revenue_pathway,organisation,next_action").eq("project_id",projectId),
  admin.from("revenue_records").select("amount,currency,payment_status,revenue_source").eq("project_id",projectId),
  admin.from("project_budgets").select("budget_amount,currency").eq("project_id",projectId).maybeSingle(),
  admin.from("project_expenses").select("amount,currency,payment_status").eq("project_id",projectId),
  admin.from("project_membership_fees").select("member_user_id,amount_due,amount_paid,currency,payment_status,fee_period").eq("project_id",projectId),
  admin.from("project_membership_pledges").select("*").eq("project_id",projectId).maybeSingle()
 ]);
 const project=pR.data;if(!project)return new Response("Project not found.",{status:404});
 const members=mR.data||[],beats=bR.data||[],tracks=tR.data||[],sessions=sR.data||[],tasks=taskR.data||[],opps=oR.data||[],revenue=rR.data||[],expenses=eR.data||[],fees=feeR.data||[],round=roundR.data,pledge=pledgeR.data;
 let rankings:any[]=[];if(round?.id){const{data}=await admin.from("track_version_rankings").select("user_id,track_id,asset_id,rank,points").eq("round_id",round.id);rankings=data||[]}
 const voters=new Set(rankings.map((x:any)=>x.user_id)).size,open=tasks.filter((x:any)=>x.status!=="done"),overdue=open.filter((x:any)=>x.due_date&&new Date(`${x.due_date}T23:59:59`)<new Date()),completedSessions=sessions.filter((x:any)=>["complete","completed"].includes(x.status)).length,finalTracks=tracks.filter((x:any)=>["release_ready","complete","final","master_approved"].includes(x.development_status||x.status)).length;
 const budget=budgetR.data,currency=pledge?.currency||budget?.currency||"KES",budgetAmount=Number(budget?.budget_amount||0),paidSpend=expenses.filter((x:any)=>x.payment_status==="paid"&&x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount||0),0),committed=expenses.filter((x:any)=>x.payment_status==="committed"&&x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const legacyMembership=revenue.filter((x:any)=>x.currency===currency&&x.payment_status!=="cancelled"&&isMembershipRevenue(x)),legacyPledge=legacyMembership.reduce((s:number,x:any)=>s+Number(x.amount||0),0),membershipPledged=pledge?Number(pledge.pledged_amount||0):legacyPledge,allocatedToMembers=fees.filter((x:any)=>x.currency===currency&&x.payment_status!=="waived").reduce((s:number,x:any)=>s+Number(x.amount_due||0),0),membershipPaid=fees.filter((x:any)=>x.currency===currency).reduce((s:number,x:any)=>s+Number(x.amount_paid||0),0),membershipOutstanding=Math.max(0,membershipPledged-membershipPaid),unallocatedPledge=Math.max(0,membershipPledged-allocatedToMembers);
 const commercialRevenue=revenue.filter((x:any)=>!isMembershipRevenue(x)),commercial=commercialRevenue.filter((x:any)=>x.payment_status==="paid"),commercialExpected=commercialRevenue.filter((x:any)=>x.currency===currency&&x.payment_status!=="cancelled").reduce((s:number,x:any)=>s+Number(x.amount||0),0);
 const memberLines=members.map((m:any)=>{const p=first(m.profiles),roles=(m.member_roles||[]).map((x:any)=>first(x.roles)?.name).filter(Boolean).join(", ");return `${p?.stage_name||p?.full_name||"Member"} — ${roles||"Project member"}`});
 const taskLines=open.slice(0,15).map((x:any)=>{const p=first(x.profiles);return `${x.title} — ${String(x.status).replaceAll("_"," ")}${x.due_date?` — due ${x.due_date}`:""}${p?` — ${p.stage_name||p.full_name}`:""}`});
 const opportunityLines=opps.slice(0,12).map((x:any)=>`${x.revenue_pathway||"Opportunity"} — ${x.organisation||"Organisation pending"} — ${String(x.status||"identified").replaceAll("_"," ")}${x.next_action?` — next: ${x.next_action}`:""}`);
 const commercialText=money(commercial,"amount").join(" / ")||"None recorded";

 const pdf=buildExecutiveProjectPdf({
  projectName:project.name,projectCode:project.code||"PROJECT",projectType:project.project_type,status:project.status,description:project.description,nextAction:project.next_action,generatedAt:new Intl.DateTimeFormat("en-KE",{dateStyle:"medium",timeStyle:"short"}).format(new Date()),
  metrics:[{label:"Active Members",value:String(members.length),note:"Project access"},{label:"Beats",value:String(beats.length),note:"Catalogue"},{label:"Tracks",value:String(tracks.length),note:`${finalTracks} release-ready`},{label:"Sessions",value:String(sessions.length),note:`${completedSessions} complete`},{label:"Open Actions",value:String(open.length),note:`${overdue.length} overdue`},{label:"Ranked Voters",value:String(voters),note:round?.status||"No round"}],
  executiveLines:[`${members.length} active members, ${beats.length} beats and ${tracks.length} tracks are currently attached to the project.`,`${finalTracks} track${finalTracks===1?"":"s"} are release-ready/final; ${Math.max(0,tracks.length-finalTracks)} remain in development.`,`${sessions.length} studio sessions are recorded, with ${completedSessions} complete.`,`${open.length} operational actions remain open; ${overdue.length} are overdue.`,round?`The latest ranked selection round is ${round.status}; ${voters} unique members have submitted rankings.`:"No ranked selection round is recorded.",`Membership pledged: ${currency} ${membershipPledged.toLocaleString("en-KE")}; allocated: ${currency} ${allocatedToMembers.toLocaleString("en-KE")}; paid: ${currency} ${membershipPaid.toLocaleString("en-KE")}; outstanding: ${currency} ${membershipOutstanding.toLocaleString("en-KE")}.`,`Commercial revenue received: ${commercialText}.`],
  sections:[
   {title:"Project Identity & Direction",eyebrow:"01 / PROJECT",lines:[`Project code: ${project.code||"Not set"}`,`Project type: ${project.project_type||"Music Project"}`,`Current stage / status: ${project.status||"active"}`,`Description: ${project.description||"No description recorded."}`,`Target release: ${project.target_release_date||"Not recorded"}`,`Next action: ${project.next_action||"Not recorded"}`]},
   {title:"People & Project Roles",eyebrow:"02 / TEAM",lines:[`Active members: ${members.length}`,...memberLines]},
   {title:"Music Catalogue & Readiness",eyebrow:"03 / MUSIC",lines:[`Beats: ${beats.length}`,`Tracks: ${tracks.length}`,`Release-ready / final tracks: ${finalTracks}`,`Still in development: ${Math.max(0,tracks.length-finalTracks)}`]},
   {title:"Production & Studio Activity",eyebrow:"04 / PRODUCTION",lines:[`Studio sessions recorded: ${sessions.length}`,`Completed sessions: ${completedSessions}`,`Scheduled / active sessions: ${Math.max(0,sessions.length-completedSessions)}`]},
   {title:"Operations & Delivery",eyebrow:"05 / EXECUTION",lines:[`Open tasks: ${open.length}`,`Overdue tasks: ${overdue.length}`,...taskLines]},
   {title:"Internal Voting & Selection",eyebrow:"06 / SELECTION",lines:round?[`Latest round status: ${round.status}`,`Unique ranked voters: ${voters}`,`Ranking entries: ${rankings.length}`,`Results visible to members: ${round.results_visible?"Yes":"No"}`,"Individual member ballots are deliberately excluded from this report."]:["No ranked selection round is currently recorded.","Individual member ballots are never exposed in this report."]},
   {title:"Financial Position",eyebrow:"07 / ECONOMICS",lines:[`Project budget: ${currency} ${budgetAmount.toLocaleString("en-KE")}`,`Actual spend: ${currency} ${paidSpend.toLocaleString("en-KE")}`,`Committed spend: ${currency} ${committed.toLocaleString("en-KE")}`,`Budget remaining: ${currency} ${(budgetAmount-paidSpend-committed).toLocaleString("en-KE")}`,`Membership pledged: ${currency} ${membershipPledged.toLocaleString("en-KE")}`,`Allocated internally: ${currency} ${allocatedToMembers.toLocaleString("en-KE")}`,`Still to allocate: ${currency} ${unallocatedPledge.toLocaleString("en-KE")}`,`Membership paid: ${currency} ${membershipPaid.toLocaleString("en-KE")}`,`Membership outstanding: ${currency} ${membershipOutstanding.toLocaleString("en-KE")}`,`Commercial expected: ${currency} ${commercialExpected.toLocaleString("en-KE")}`,`Commercial revenue received: ${commercialText}`]},
   {title:"Commercial Pathways",eyebrow:"08 / MARKET",lines:[`Commercial opportunities: ${opps.length}`,...opportunityLines]},
   {title:"Management Attention",eyebrow:"09 / NEXT MOVE",lines:[`Immediate next action: ${project.next_action||"Define the next project action."}`,overdue.length?`${overdue.length} overdue task${overdue.length===1?"":"s"} require follow-up.`:"No overdue operational tasks are recorded.",`Membership outstanding against pledge: ${currency} ${membershipOutstanding.toLocaleString("en-KE")}.`,`Membership still to allocate internally: ${currency} ${unallocatedPledge.toLocaleString("en-KE")}.`]}
  ]
 });
 const safe=String(project.name||"FACKTS Music Project").replace(/[^a-zA-Z0-9 -]+/g,"").trim();
 return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safe} Executive Project Report.pdf"`,"Cache-Control":"no-store"}});
}
