import {createClient} from "../../../../../lib/supabase/server";
import {createAdminClient} from "../../../../../lib/supabase/admin";
import {getControlRoomPermissions} from "../../../../../lib/controlRoom";
import {canViewProjectFinanceReport} from "../../../../../lib/financeAccess";
import {buildExecutiveProjectPdf} from "../../../../../lib/executiveProjectPdf";

const first=(v:any)=>Array.isArray(v)?v[0]:v;
const isMembershipRevenue=(item:any)=>{
  const source=String(item.revenue_source||"").toLowerCase();
  return [
    "membership","member fee","member fees","membership fee","membership fees",
    "contribution","contributions","member contribution","member contributions"
  ].some(term=>source.includes(term));
};

const money=(rows:any[],field:string)=>{
  const map=new Map<string,number>();
  rows.forEach(row=>{
    const currency=row.currency||"KES";
    map.set(currency,(map.get(currency)||0)+Number(row[field]||0));
  });
  return [...map.entries()].map(([currency,amount])=>`${currency} ${amount.toLocaleString("en-KE")}`);
};

export async function GET(
  _request:Request,
  {params}:{params:Promise<{projectId:string}>}
){
  const{projectId}=await params;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();

  if(!user)return new Response("Authentication required.",{status:401});

  const admin=createAdminClient();

  const[{data:membership},permissions]=await Promise.all([
    admin.from("project_members").select("id,member_roles(roles(name))").eq("project_id",projectId).eq("user_id",user.id).eq("status","active").maybeSingle(),
    getControlRoomPermissions(user.id)
  ]);

  if(!membership&&!permissions.includes("all")&&!permissions.includes("reports")&&!permissions.includes("projects")){
    return new Response("Report access unavailable.",{status:403});
  }

  if(membership&&!permissions.includes("all")&&!permissions.includes("reports")&&!permissions.includes("projects")){
    const memberRoles=(membership.member_roles||[])
      .map((row:any)=>Array.isArray(row.roles)?row.roles[0]?.name:row.roles?.name)
      .filter(Boolean);

    if(!canViewProjectFinanceReport(memberRoles)){
      return new Response("This report contains financial information and is not available for your project role.",{status:403});
    }
  }

  const[
    projectR,membersR,beatsR,tracksR,sessionsR,tasksR,roundR,
    oppsR,revenueR,budgetR,expensesR,transactionsR
  ]=await Promise.all([
    admin.from("projects").select("id,code,name,description,status,project_type,next_action,start_date,target_release_date").eq("id",projectId).maybeSingle(),
    admin.from("project_members").select("id,user_id,profiles(full_name,stage_name),member_roles(roles(name))").eq("project_id",projectId).eq("status","active"),
    admin.from("beats").select("id,title,status").eq("project_id",projectId),
    admin.from("tracks").select("id,working_title,status,development_status").eq("project_id",projectId),
    admin.from("studio_sessions").select("id,status,starts_at").eq("project_id",projectId),
    admin.from("project_tasks").select("id,title,status,due_date,profiles!project_tasks_assignee_id_fkey(full_name,stage_name)").eq("project_id",projectId),
    admin.from("track_voting_rounds").select("id,status,results_visible,closes_at").eq("project_id",projectId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    admin.from("commercial_opportunities").select("id,status,revenue_pathway,organisation,next_action,estimated_value,negotiated_value,contracted_value,currency").eq("project_id",projectId),
    admin.from("revenue_records").select("amount,currency,payment_status,revenue_source").eq("project_id",projectId),
    admin.from("project_budgets").select("budget_amount,currency").eq("project_id",projectId).maybeSingle(),
    admin.from("project_expenses").select("amount,currency,payment_status").eq("project_id",projectId),
    admin.from("project_membership_transactions").select("member_user_id,amount,currency,status,payment_period,transaction_date").eq("project_id",projectId),
  ]);

  const project=projectR.data;
  if(!project)return new Response("Project not found.",{status:404});

  const members=membersR.data||[];
  const beats=beatsR.data||[];
  const tracks=tracksR.data||[];
  const sessions=sessionsR.data||[];
  const tasks=tasksR.data||[];
  const opps=oppsR.data||[];
  const revenue=revenueR.data||[];
  const expenses=expensesR.data||[];
  const transactions=transactionsR.data||[];
  const round=roundR.data;

  let rankings:any[]=[];
  if(round?.id){
    const{data}=await admin.from("track_version_rankings")
      .select("user_id,track_id,asset_id,rank,points")
      .eq("round_id",round.id);
    rankings=data||[];
  }

  const voters=new Set(rankings.map((x:any)=>x.user_id)).size;
  const openTasks=tasks.filter((x:any)=>x.status!=="done");
  const overdue=openTasks.filter((x:any)=>x.due_date&&new Date(`${x.due_date}T23:59:59`)<new Date());
  const completedSessions=sessions.filter((x:any)=>["complete","completed"].includes(x.status)).length;
  const finalTracks=tracks.filter((x:any)=>["release_ready","complete","final","master_approved"].includes(x.development_status||x.status)).length;

  const budget=budgetR.data;
  const currency=budget?.currency||"KES";
  const budgetAmount=Number(budget?.budget_amount||0);

  const paidSpend=expenses
    .filter((x:any)=>x.payment_status==="paid"&&x.currency===currency)
    .reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);

  const committedSpend=expenses
    .filter((x:any)=>x.payment_status==="committed"&&x.currency===currency)
    .reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);

  const postedTransactions=transactions.filter(
    (x:any)=>x.status==="posted"&&x.currency==="KES"
  );

  const lifetimeMembershipCollected=postedTransactions.reduce(
    (sum:number,x:any)=>sum+Number(x.amount||0),0
  );

  const commercialRevenue=revenue.filter((x:any)=>!isMembershipRevenue(x));
  const commercialPaid=commercialRevenue.filter((x:any)=>x.payment_status==="paid");

  const activeOpportunities=opps.filter(
    (item:any)=>!["lost","completed"].includes(String(item.status||"").toLowerCase())
  );

  const opportunityExpected=activeOpportunities
    .filter((item:any)=>(item.currency||"KES")===currency)
    .reduce((sum:number,item:any)=>{
      const value=
        item.contracted_value!=null
          ?Number(item.contracted_value||0)
          :item.negotiated_value!=null
          ?Number(item.negotiated_value||0)
          :Number(item.estimated_value||0);
      return sum+value;
    },0);

  const opportunityReceived=commercialRevenue
    .filter((item:any)=>item.payment_status==="paid"&&item.currency===currency)
    .reduce((sum:number,item:any)=>sum+Number(item.amount||0),0);

  const lifetimeMembershipCash=postedTransactions.reduce(
    (sum:number,item:any)=>sum+Number(item.amount||0),0
  );

  const totalCashIn=lifetimeMembershipCash+opportunityReceived;
  const cashAvailable=totalCashIn-paidSpend;

  const memberLines=members.map((member:any)=>{
    const profile=first(member.profiles);
    const roleNames=(member.member_roles||[])
      .map((row:any)=>first(row.roles)?.name)
      .filter(Boolean)
      .join(", ");
    return `${profile?.stage_name||profile?.full_name||"Member"} — ${roleNames||"Project member"}`;
  });

  const taskLines=openTasks.slice(0,15).map((task:any)=>{
    const profile=first(task.profiles);
    return `${task.title} — ${String(task.status).replaceAll("_"," ")}${task.due_date?` — due ${task.due_date}`:""}${profile?` — ${profile.stage_name||profile.full_name}`:""}`;
  });

  const opportunityLines=opps.slice(0,12).map((item:any)=>
    `${item.revenue_pathway||"Opportunity"} — ${item.organisation||"Organisation pending"} — ${String(item.status||"identified").replaceAll("_"," ")}${item.next_action?` — next: ${item.next_action}`:""}`
  );

  const commercialText=money(commercialPaid,"amount").join(" / ")||"None recorded";
  const pdf=buildExecutiveProjectPdf({
    projectName:project.name,
    projectCode:project.code||"PROJECT",
    projectType:project.project_type,
    status:project.status,
    description:project.description,
    nextAction:project.next_action,
    generatedAt:new Intl.DateTimeFormat("en-KE",{dateStyle:"medium",timeStyle:"short"}).format(new Date()),
    metrics:[
      {label:"Active Members",value:String(members.length),note:"Project access"},
      {label:"Beats",value:String(beats.length),note:"Catalogue"},
      {label:"Tracks",value:String(tracks.length),note:`${finalTracks} release-ready`},
      {label:"Sessions",value:String(sessions.length),note:`${completedSessions} complete`},
      {label:"Open Actions",value:String(openTasks.length),note:`${overdue.length} overdue`},
      {label:"Ranked Voters",value:String(voters),note:round?.status||"No round"}
    ],
    executiveLines:[
      `${members.length} active members, ${beats.length} beats and ${tracks.length} tracks are currently attached to the project.`,
      `${finalTracks} track${finalTracks===1?"":"s"} are release-ready/final; ${Math.max(0,tracks.length-finalTracks)} remain in development.`,
      `${sessions.length} studio sessions are recorded, with ${completedSessions} complete.`,
      `${openTasks.length} operational actions remain open; ${overdue.length} are overdue.`,
      round?`The latest ranked selection round is ${round.status}; ${voters} unique members have submitted rankings.`:"No ranked selection round is recorded.",
      `Cash collected from membership transactions: KES ${lifetimeMembershipCash.toLocaleString("en-KE")}.`,
      `Opportunity revenue expected: ${currency} ${opportunityExpected.toLocaleString("en-KE")}; opportunity revenue received: ${currency} ${opportunityReceived.toLocaleString("en-KE")}.`,
      `Expenses paid: ${currency} ${paidSpend.toLocaleString("en-KE")}; cash available: ${currency} ${cashAvailable.toLocaleString("en-KE")}.`
    ],
    sections:[
      {
        title:"Project Identity & Direction",
        eyebrow:"01 / PROJECT",
        lines:[
          `Project code: ${project.code||"Not set"}`,
          `Project type: ${project.project_type||"Music Project"}`,
          `Current stage / status: ${project.status||"active"}`,
          `Description: ${project.description||"No description recorded."}`,
          `Target release: ${project.target_release_date||"Not recorded"}`,
          `Next action: ${project.next_action||"Not recorded"}`
        ]
      },
      {
        title:"People & Project Roles",
        eyebrow:"02 / TEAM",
        lines:[`Active members: ${members.length}`,...memberLines]
      },
      {
        title:"Music Catalogue & Readiness",
        eyebrow:"03 / MUSIC",
        lines:[
          `Beats: ${beats.length}`,
          `Tracks: ${tracks.length}`,
          `Release-ready / final tracks: ${finalTracks}`,
          `Still in development: ${Math.max(0,tracks.length-finalTracks)}`
        ]
      },
      {
        title:"Production & Studio Activity",
        eyebrow:"04 / PRODUCTION",
        lines:[
          `Studio sessions recorded: ${sessions.length}`,
          `Completed sessions: ${completedSessions}`,
          `Scheduled / active sessions: ${Math.max(0,sessions.length-completedSessions)}`
        ]
      },
      {
        title:"Operations & Delivery",
        eyebrow:"05 / EXECUTION",
        lines:[`Open tasks: ${openTasks.length}`,`Overdue tasks: ${overdue.length}`,...taskLines]
      },
      {
        title:"Internal Voting & Selection",
        eyebrow:"06 / SELECTION",
        lines:round?[
          `Latest round status: ${round.status}`,
          `Unique ranked voters: ${voters}`,
          `Ranking entries: ${rankings.length}`,
          `Results visible to members: ${round.results_visible?"Yes":"No"}`,
          "Individual member ballots are deliberately excluded from this report."
        ]:[
          "No ranked selection round is currently recorded.",
          "Individual member ballots are never exposed in this report."
        ]
      },
      {
        title:"Financial Position",
        eyebrow:"07 / ECONOMICS",
        lines:[
          `Cash collected: KES ${lifetimeMembershipCash.toLocaleString("en-KE")}`,
          `Opportunity revenue expected: ${currency} ${opportunityExpected.toLocaleString("en-KE")}`,
          `Opportunity revenue received: ${currency} ${opportunityReceived.toLocaleString("en-KE")}`,
          `Expenses paid: ${currency} ${paidSpend.toLocaleString("en-KE")}`,
          `Cash available: ${currency} ${cashAvailable.toLocaleString("en-KE")}`
        ]
      },
      {
        title:"Commercial Pathways",
        eyebrow:"08 / MARKET",
        lines:[`Commercial opportunities: ${opps.length}`,...opportunityLines]
      },
      {
        title:"Management Attention",
        eyebrow:"09 / NEXT MOVE",
        lines:[
          `Immediate next action: ${project.next_action||"Define the next project action."}`,
          overdue.length?`${overdue.length} overdue task${overdue.length===1?"":"s"} require follow-up.`:"No overdue operational tasks are recorded."
        ]
      }
    ]
  });

  const safe=String(project.name||"FACKTS Music Project")
    .replace(/[^a-zA-Z0-9 -]+/g,"")
    .trim();

  return new Response(new Uint8Array(pdf),{
    headers:{
      "Content-Type":"application/pdf",
      "Content-Disposition":`attachment; filename="${safe} Executive Project Report.pdf"`,
      "Cache-Control":"no-store"
    }
  });
}
