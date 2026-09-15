import {createClient} from "../../../../../../lib/supabase/server";
import {createAdminClient} from "../../../../../../lib/supabase/admin";
import {canViewProjectFinanceReport} from "../../../../../../lib/financeAccess";

const isMembershipRevenue=(item:any)=>{
  const source=String(item.revenue_source||"").toLowerCase();
  return [
    "membership","member fee","member fees","membership fee","membership fees",
    "contribution","contributions","member contribution","member contributions"
  ].some((term)=>source.includes(term));
};

const dateValue=(value:any)=>{
  if(!value)return null;
  const date=new Date(String(value).length===10?`${value}T12:00:00`:value);
  return Number.isNaN(date.getTime())?null:date;
};

const within=(value:any,from:string,to:string)=>{
  const date=dateValue(value);
  if(!date)return !from&&!to;
  if(from&&date<new Date(`${from}T00:00:00`))return false;
  if(to&&date>new Date(`${to}T23:59:59`))return false;
  return true;
};

const csv=(value:any)=>{
  const text=String(value??"");
  return `"${text.replaceAll('"','""')}"`;
};

export async function GET(
  request:Request,
  {params}:{params:Promise<{projectId:string}>}
){
  const{projectId}=await params;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();

  if(!user)return new Response("Authentication required.",{status:401});

  const admin=createAdminClient();

  const{data:membership}=await admin.from("project_members")
    .select("id,member_roles(roles(name))")
    .eq("project_id",projectId)
    .eq("user_id",user.id)
    .eq("status","active")
    .maybeSingle();

  if(!membership)return new Response("Project membership required.",{status:403});

  const roles=(membership.member_roles||[])
    .map((row:any)=>Array.isArray(row.roles)?row.roles[0]?.name:row.roles?.name)
    .filter(Boolean);

  if(!canViewProjectFinanceReport(roles)){
    return new Response("Financial reporting is not available for your project role.",{status:403});
  }

  const url=new URL(request.url);
  const from=url.searchParams.get("from")||"";
  const to=url.searchParams.get("to")||"";
  const type=url.searchParams.get("type")||"all";
  const status=url.searchParams.get("status")||"all";
  const category=url.searchParams.get("category")||"all";

  const[projectR,expensesR,revenueR,transactionsR]=await Promise.all([
    admin.from("projects").select("code,name").eq("id",projectId).maybeSingle(),
    admin.from("project_expenses").select("*,tracks(working_title)").eq("project_id",projectId).order("expense_date",{ascending:false}).limit(1000),
    admin.from("revenue_records").select("*,tracks(working_title)").eq("project_id",projectId).order("created_at",{ascending:false}).limit(1000),
    admin.from("project_membership_transactions").select("*").eq("project_id",projectId).order("transaction_date",{ascending:false}).limit(2000),
  ]);

  const expenses=expensesR.data||[];
  const commercial=(revenueR.data||[]).filter((x:any)=>!isMembershipRevenue(x));
  const transactions=transactionsR.data||[];

  const filteredExpenses=expenses.filter((x:any)=>
    (type==="all"||type==="expenses") &&
    (status==="all"||x.payment_status===status) &&
    (category==="all"||String(x.category||"Uncategorised")===category) &&
    within(x.expense_date||x.created_at,from,to)
  );

  const filteredCommercial=commercial.filter((x:any)=>
    (type==="all"||type==="commercial") &&
    (status==="all"||x.payment_status===status) &&
    within(x.received_date||x.expected_date||x.created_at,from,to)
  );

  const filteredMembership=transactions.filter((x:any)=>
    (type==="all"||type==="membership") &&
    (status==="all"||x.status===status) &&
    within(x.transaction_date||x.created_at,from,to)
  );

  const rows=[
    ...filteredExpenses.map((x:any)=>[
      x.expense_date||x.created_at,
      "Expense",
      x.category||"Project expense",
      x.vendor||"Project-wide",
      x.payment_status||"",
      x.currency||"KES",
      -Number(x.amount||0),
      x.notes||"",
    ]),
    ...filteredCommercial.map((x:any)=>[
      x.received_date||x.expected_date||x.created_at,
      "Commercial",
      x.revenue_source||"Commercial revenue",
      Array.isArray(x.tracks)?x.tracks[0]?.working_title:x.tracks?.working_title||"Project-wide",
      x.payment_status||"",
      x.currency||"KES",
      Number(x.amount||0),
      x.notes||"",
    ]),
    ...filteredMembership.map((x:any)=>[
      x.transaction_date||x.created_at,
      "Membership",
      x.transaction_code||"Membership payment",
      `${x.payment_method||"Payment"}${x.payment_reference?` · ${x.payment_reference}`:""}`,
      x.status||"",
      x.currency||"KES",
      x.status==="posted"?Number(x.amount||0):0,
      x.note||"",
    ]),
  ].sort((a:any[],b:any[])=>(dateValue(b[0])?.getTime()||0)-(dateValue(a[0])?.getTime()||0));

  const header=["Date","Type","Description","Detail","Status","Currency","Amount","Note"];
  const body=[header,...rows].map((row:any[])=>row.map(csv).join(",")).join("\n");

  const project=projectR.data;
  const safe=String(project?.code||project?.name||"FACKTS Music")
    .replace(/[^a-zA-Z0-9 -]+/g,"")
    .trim();

  return new Response(body,{
    headers:{
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":`attachment; filename="${safe} Finance Report.csv"`,
      "Cache-Control":"no-store",
    }
  });
}
