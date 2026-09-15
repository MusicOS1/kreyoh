import Link from "next/link";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {canEditProjectFinance,canViewProjectFinanceReport} from "../../lib/financeAccess";
import {creatorDisplayName} from "../../lib/profileIdentity";
import {
  addProjectExpense,
  addRevenueRecord,
  recordMembershipPayment,
  saveProjectBudget
} from "./actions";

const first=(v:any)=>Array.isArray(v)?v[0]:v;
const MONTHLY_FEE=2000;

const isMembershipRevenue=(item:any)=>{
  const source=String(item.revenue_source||"").toLowerCase();
  return [
    "membership","member fee","member fees","membership fee","membership fees",
    "contribution","contributions","member contribution","member contributions"
  ].some((term)=>source.includes(term));
};

const periodStart=(month:string)=>{
  const safe=/^\d{4}-\d{2}$/.test(month)?month:new Date().toISOString().slice(0,7);
  return `${safe}-01`;
};

const periodLabel=(month:string)=>
  new Date(`${periodStart(month)}T12:00:00`).toLocaleDateString("en-KE",{month:"long",year:"numeric"});

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

export default async function FinancePage({
  searchParams
}:{
  searchParams:Promise<{
    month?:string;
    from?:string;
    to?:string;
    type?:string;
    status?:string;
    category?:string;
  }>
}){
  const params=await searchParams;
  const{admin,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
  }

  const isProjectAdmin=canEditProjectFinance(roles);
  const canViewFinance=canViewProjectFinanceReport(roles);

  if(!canViewFinance){
    return<AppShell>
      <div className="content empty-state">
        <span className="eyebrow">{project.code} / PROJECT ACCESS</span>
        <h2>Finance reporting is not available for your project role</h2>
        <p>Financial reporting is limited to project administrators and core music/project roles such as Artists, Producers, Engineers, A&R, Managers and Studio Owners.</p>
        <Link className="secondary-button-inline" href="/member-dashboard">Return to Dashboard →</Link>
      </div>
    </AppShell>;
  }
  const selectedMonth=/^\d{4}-\d{2}$/.test(params.month||"")
    ?String(params.month)
    :new Date().toISOString().slice(0,7);

  const selectedPeriod=periodStart(selectedMonth);

  const[
    budgetR,expensesR,revenueR,tracksR,oppsR,accountsR,transactionsR,membersR
  ]=await Promise.all([
    admin.from("project_budgets").select("*").eq("project_id",project.id).maybeSingle(),
    admin.from("project_expenses").select("*,tracks(working_title)").eq("project_id",project.id).order("expense_date",{ascending:false}).limit(500),
    admin.from("revenue_records").select("*,tracks(working_title)").eq("project_id",project.id).order("created_at",{ascending:false}).limit(500),
    admin.from("tracks").select("id,working_title").eq("project_id",project.id).order("working_title"),
    admin.from("commercial_opportunities").select("id,organisation,opportunity_type,status,estimated_value,negotiated_value,contracted_value,currency,next_action").eq("project_id",project.id).order("created_at",{ascending:false}),
    admin.from("project_membership_accounts").select("*").eq("project_id",project.id).eq("status","active").order("member_code",{ascending:true}),
    admin.from("project_membership_transactions").select("*").eq("project_id",project.id).order("transaction_date",{ascending:false}).order("created_at",{ascending:false}).limit(2000),
    admin.from("project_members").select("user_id,profiles(full_name,stage_name,nickname,email)").eq("project_id",project.id).eq("status","active").order("joined_at",{ascending:true}),
  ]);

  const budget=budgetR.data;
  const expenses=expensesR.data||[];
  const revenue=revenueR.data||[];
  const tracks=tracksR.data||[];
  const opportunities=oppsR.data||[];
  const accounts=accountsR.data||[];
  const transactions=transactionsR.data||[];
  const members=membersR.data||[];

  const memberMap=new Map<string,any>(
    members.map((m:any)=>[m.user_id,first(m.profiles)])
  );
  const accountByMember=new Map<string,any>(
    accounts.map((a:any)=>[a.member_user_id,a])
  );

  const budgetAmount=Number(budget?.budget_amount||0);
  const currency="KES";

  const paidSpend=expenses
    .filter((x:any)=>x.payment_status==="paid"&&x.currency===currency)
    .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

  const committedSpend=expenses
    .filter((x:any)=>x.payment_status==="committed"&&x.currency===currency)
    .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

  const commercialRevenue=revenue.filter((x:any)=>!isMembershipRevenue(x));

  const commercialExpected=commercialRevenue
    .filter((x:any)=>x.currency===currency&&x.payment_status!=="cancelled")
    .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

  const commercialReceived=commercialRevenue
    .filter((x:any)=>x.payment_status==="paid"&&x.currency===currency)
    .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

  const activeOpportunities=opportunities.filter(
    (item:any)=>!["lost","completed"].includes(String(item.status||"").toLowerCase())
  );

  const opportunityExpected=activeOpportunities
    .filter((item:any)=>(item.currency||"KES")===currency)
    .reduce((sum:number,item:any)=>{
      const bestAvailable=
        item.contracted_value!=null
          ?Number(item.contracted_value||0)
          :item.negotiated_value!=null
          ?Number(item.negotiated_value||0)
          :Number(item.estimated_value||0);
      return sum+bestAvailable;
    },0);

  const posted=transactions.filter((x:any)=>x.status==="posted"&&x.currency===currency);
  const lifetimeMembershipCollected=posted.reduce(
    (sum:number,x:any)=>sum+Number(x.amount||0),0
  );

  const periodTransactions=posted.filter(
    (x:any)=>String(x.payment_period||"").slice(0,10)===selectedPeriod
  );

  const paidByMember=new Map<string,number>();
  periodTransactions.forEach((txn:any)=>{
    paidByMember.set(
      txn.member_user_id,
      (paidByMember.get(txn.member_user_id)||0)+Number(txn.amount||0)
    );
  });

  const lifetimePaidByMember=new Map<string,number>();
  posted.forEach((txn:any)=>{
    lifetimePaidByMember.set(
      txn.member_user_id,
      (lifetimePaidByMember.get(txn.member_user_id)||0)+Number(txn.amount||0)
    );
  });

  const latestTxnByMember=new Map<string,any>();
  transactions.forEach((txn:any)=>{
    if(!latestTxnByMember.has(txn.member_user_id)){
      latestTxnByMember.set(txn.member_user_id,txn);
    }
  });

  const monthlyRequired=members.length*MONTHLY_FEE;
  const monthlyCollected=periodTransactions.reduce(
    (sum:number,x:any)=>sum+Number(x.amount||0),0
  );

  let monthlyOutstanding=0;
  let monthlyCredit=0;

  members.forEach((member:any)=>{
    const paid=paidByMember.get(member.user_id)||0;
    if(paid<MONTHLY_FEE)monthlyOutstanding+=MONTHLY_FEE-paid;
    if(paid>MONTHLY_FEE)monthlyCredit+=paid-MONTHLY_FEE;
  });

  const totalCashIn=lifetimeMembershipCollected+commercialReceived;
  const cashAvailable=totalCashIn-paidSpend;

  if(!isProjectAdmin){
    const from=params.from||"";
    const to=params.to||"";
    const type=params.type||"all";
    const status=params.status||"all";
    const category=params.category||"all";

    const periodExpenses=expenses.filter((x:any)=>{
      if(type!=="all"&&type!=="expenses")return false;
      if(status!=="all"&&x.payment_status!==status)return false;
      if(category!=="all"&&String(x.category||"Uncategorised")!==category)return false;
      return within(x.expense_date||x.created_at,from,to);
    });

    const periodCommercial=commercialRevenue.filter((x:any)=>{
      if(type!=="all"&&type!=="commercial")return false;
      if(status!=="all"&&x.payment_status!==status)return false;
      return within(x.received_date||x.expected_date||x.created_at,from,to);
    });

    const reportMembership=transactions.filter((x:any)=>{
      if(type!=="all"&&type!=="membership")return false;
      if(status!=="all"&&x.status!==status)return false;
      return within(x.transaction_date||x.created_at,from,to);
    });

    const reportSpend=periodExpenses
      .filter((x:any)=>x.currency===currency&&x.payment_status==="paid")
      .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

    const reportCommitted=periodExpenses
      .filter((x:any)=>x.currency===currency&&x.payment_status==="committed")
      .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

    const reportCommercialReceived=periodCommercial
      .filter((x:any)=>x.currency===currency&&x.payment_status==="paid")
      .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

    const reportMembershipCollected=reportMembership
      .filter((x:any)=>x.currency===currency&&x.status==="posted")
      .reduce((s:number,x:any)=>s+Number(x.amount||0),0);

    const reportInflow=reportCommercialReceived+reportMembershipCollected;
    const netMovement=reportInflow-reportSpend;

    const categories=Array.from(
      new Set(expenses.map((x:any)=>String(x.category||"Uncategorised")))
    ).sort();

    const statuses=Array.from(
      new Set([
        ...expenses.map((x:any)=>x.payment_status),
        ...commercialRevenue.map((x:any)=>x.payment_status),
        ...transactions.map((x:any)=>x.status),
      ].filter(Boolean))
    ).sort();

    const rows=[
      ...periodExpenses.map((x:any)=>({
        id:`expense-${x.id}`,
        date:x.expense_date||x.created_at,
        type:"Expense",
        description:x.category||"Project expense",
        detail:x.vendor||first(x.tracks)?.working_title||"Project-wide",
        amount:-Number(x.amount||0),
        currency:x.currency||currency,
        status:x.payment_status||"",
      })),
      ...periodCommercial.map((x:any)=>({
        id:`revenue-${x.id}`,
        date:x.received_date||x.expected_date||x.created_at,
        type:"Commercial",
        description:x.revenue_source||"Commercial revenue",
        detail:first(x.tracks)?.working_title||"Project-wide",
        amount:Number(x.amount||0),
        currency:x.currency||currency,
        status:x.payment_status||"",
      })),
      ...reportMembership.map((x:any)=>{
        const account=accountByMember.get(x.member_user_id);
        const person=memberMap.get(x.member_user_id);
        return{
          id:`membership-${x.id}`,
          date:x.transaction_date||x.created_at,
          type:"Membership",
          description:`${x.transaction_code} · ${creatorDisplayName(person)}`,
          detail:`${account?.member_code||"Member"} · ${x.payment_method||"Payment"}${x.payment_reference?` · ${x.payment_reference}`:""}${x.note?` · ${x.note}`:""}`,
          amount:x.status==="posted"?Number(x.amount||0):0,
          currency:x.currency||currency,
          status:x.status||"",
          href:`/finance/transactions/${x.id}`,
        };
      }),
    ].sort((a:any,b:any)=>{
      const ad=dateValue(a.date)?.getTime()||0;
      const bd=dateValue(b.date)?.getTime()||0;
      return bd-ad;
    });

    const query=new URLSearchParams();
    if(from)query.set("from",from);
    if(to)query.set("to",to);
    if(type!=="all")query.set("type",type);
    if(status!=="all")query.set("status",status);
    if(category!=="all")query.set("category",category);

    return<AppShell>
      <style>{`
        .member-finance-shell{max-width:1320px;margin:0 auto}
        .member-finance-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:end;padding:28px;border:1px solid rgba(255,255,255,.08);border-radius:22px;background:radial-gradient(circle at 90% 10%,rgba(249,115,22,.12),transparent 32%),linear-gradient(145deg,rgba(15,17,23,.98),rgba(7,8,12,.98))}
        .member-finance-hero h1{margin:7px 0 10px;font-size:clamp(36px,5vw,64px);line-height:.96;letter-spacing:-.05em}
        .member-finance-hero p{max-width:720px;color:rgba(255,255,255,.58);line-height:1.6}
        .report-mode-pill{display:inline-flex;padding:8px 11px;border:1px solid rgba(255,138,31,.3);border-radius:999px;background:rgba(255,138,31,.07);color:#ff9a46;font-size:9px;font-weight:900;letter-spacing:.08em}
        .report-filter{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) auto;gap:9px;margin:16px 0;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:16px;background:rgba(255,255,255,.02)}
        .report-filter label{display:grid;gap:6px;font-size:9px;font-weight:850;color:rgba(255,255,255,.48);text-transform:uppercase;letter-spacing:.05em}
        .report-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:16px 0}
        .report-kpis article{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
        .report-kpis span{display:block;color:rgba(255,255,255,.42);font-size:8px;font-weight:900;text-transform:uppercase}
        .report-kpis strong{display:block;margin-top:7px;font-size:17px}
        .report-table{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:16px}
        .report-table table{width:100%;border-collapse:collapse;min-width:820px}
        .report-table th,.report-table td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.055);text-align:left;font-size:11px}
        .report-table th{color:rgba(255,255,255,.42);font-size:8px;text-transform:uppercase}
        .report-table small{display:block;color:rgba(255,255,255,.4);margin-top:3px}
        @media(max-width:1100px){.report-filter{grid-template-columns:repeat(3,minmax(0,1fr))}.report-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:700px){.member-finance-hero{grid-template-columns:1fr}.report-filter,.report-kpis{grid-template-columns:1fr}}
      `}</style>

      <div className="content operations-page member-finance-shell">
        <section className="member-finance-hero">
          <div>
            <span className="eyebrow">{project.code} / TRANSPARENCY REPORT</span>
            <h1>Financial Report</h1>
            <p>Read-only project economics. Membership collections are actual payment transactions; the current membership rule is KES 2,000 per active member per month.</p>
          </div>
          <span className="report-mode-pill">READ ONLY · NO EDITING</span>
        </section>

        <form className="report-filter" method="get">
          <label>From<input type="date" name="from" defaultValue={from}/></label>
          <label>To<input type="date" name="to" defaultValue={to}/></label>
          <label>Transaction<select name="type" defaultValue={type}><option value="all">All activity</option><option value="expenses">Expenses</option><option value="commercial">Commercial revenue</option><option value="membership">Membership collections</option></select></label>
          <label>Status<select name="status" defaultValue={status}><option value="all">All statuses</option>{statuses.map((item:any)=><option key={item} value={item}>{String(item).replaceAll("_"," ")}</option>)}</select></label>
          <label>Expense category<select name="category" defaultValue={category}><option value="all">All categories</option>{categories.map((item:any)=><option key={item} value={item}>{item}</option>)}</select></label>
          <button>Apply Filters</button>
        </form>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          <Link className="secondary-button-inline" href="/finance">Clear Filters</Link>
          <a className="secondary-button-inline" href={`/api/projects/${project.id}/finance-report${query.toString()?`?${query.toString()}`:""}`}>Export Filtered CSV ↓</a>
          <a className="secondary-button-inline" href={`/api/projects/${project.id}/report`}>Executive Project Report ↓</a>
        </div>

        <section className="report-kpis">
          <article><span>Project Budget</span><strong>KES {budgetAmount.toLocaleString("en-KE")}</strong></article>
          <article><span>Period Spend</span><strong>KES {reportSpend.toLocaleString("en-KE")}</strong></article>
          <article><span>Period Committed</span><strong>KES {reportCommitted.toLocaleString("en-KE")}</strong></article>
          <article><span>Membership Collected</span><strong>KES {reportMembershipCollected.toLocaleString("en-KE")}</strong></article>
          <article><span>Commercial Received</span><strong>KES {reportCommercialReceived.toLocaleString("en-KE")}</strong></article>
          <article><span>Net Cash Movement</span><strong>KES {netMovement.toLocaleString("en-KE")}</strong></article>
        </section>

        <section className="platform-home-section">
          <div className="platform-section-heading"><div><span className="eyebrow">FILTERED LEDGER</span><h2>{from||to?`${from||"Start"} → ${to||"Today"}`:"All recorded activity"}</h2></div><span>{rows.length} records</span></div>
          <div className="report-table"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Status</th><th>Amount</th></tr></thead><tbody>
            {!rows.length&&<tr><td colSpan={5}>No records match this report filter.</td></tr>}
            {rows.map((row:any)=><tr key={row.id}><td>{row.date?new Date(String(row.date).length===10?`${row.date}T12:00:00`:row.date).toLocaleDateString("en-KE"):"—"}</td><td>{row.type}</td><td>{row.href?<Link href={row.href}><strong>{row.description}</strong></Link>:<strong>{row.description}</strong>}<small>{row.detail}</small></td><td>{String(row.status).replaceAll("_"," ")}</td><td>{row.currency} {Math.abs(row.amount).toLocaleString("en-KE")}</td></tr>)}
          </tbody></table></div>
        </section>

        <section className="platform-home-section" style={{marginTop:18}}>
          <div className="platform-section-heading">
            <div>
              <span className="eyebrow">MEMBERSHIP PAYMENT AUDIT TRAIL</span>
              <h2>How payments have been coming in</h2>
            </div>
            <span>Read only</span>
          </div>

          <div className="report-table">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Method / Reference</th>
                  <th>Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!reportMembership.length&&<tr><td colSpan={7}>No membership payments match this reporting period.</td></tr>}
                {reportMembership.map((txn:any)=>{
                  const account=accountByMember.get(txn.member_user_id);
                  const person=memberMap.get(txn.member_user_id);
                  return<tr key={txn.id}>
                    <td><Link href={`/finance/transactions/${txn.id}`}><strong>{txn.transaction_code}</strong></Link></td>
                    <td>{txn.transaction_date?new Date(`${txn.transaction_date}T12:00:00`).toLocaleDateString("en-KE"):"—"}</td>
                    <td>
                      {account
                        ?<Link href={`/finance/members/${account.id}`}><strong>{account.member_code} · {creatorDisplayName(person)}</strong></Link>
                        :<strong>{creatorDisplayName(person)}</strong>}
                    </td>
                    <td>{txn.currency||"KES"} {Number(txn.amount||0).toLocaleString("en-KE")}</td>
                    <td>{txn.payment_method||"—"}<small>{txn.payment_reference||"No reference"}</small></td>
                    <td>{txn.note||"—"}</td>
                    <td>{String(txn.status||"posted").toUpperCase()}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <p style={{marginTop:12,color:"rgba(255,255,255,.4)",fontSize:10}}>
            Report view only. You can inspect member and transaction records, but only project administrators can add, edit, reverse or remove financial records.
          </p>
        </section>
      </div>
    </AppShell>;
  }

  return<AppShell>
    <style>{`
      .monthly-rule{padding:16px 18px;border:1px solid rgba(255,138,31,.2);border-radius:14px;background:rgba(255,138,31,.045);line-height:1.55;margin:16px 0}
      .monthly-rule strong{color:#ff9a46}
      .month-switch{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:15px 0}
      .month-switch label{display:grid;gap:5px;color:rgba(255,255,255,.45);font-size:9px;text-transform:uppercase;font-weight:900}
      .monthly-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:14px 0 20px}
      .monthly-kpis article{padding:15px;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.025)}
      .monthly-kpis span{display:block;color:rgba(255,255,255,.42);font-size:8px;font-weight:850;text-transform:uppercase}
      .monthly-kpis strong{display:block;margin-top:7px;font-size:18px}.monthly-kpis small{display:block;margin-top:6px;color:rgba(255,255,255,.38);font-size:9px;line-height:1.4}.monthly-kpis small a{color:#ff9a46}
      .member-ledger,.txn-ledger{overflow-x:auto;border:1px solid rgba(255,255,255,.07);border-radius:14px}
      .member-ledger table,.txn-ledger table{width:100%;border-collapse:collapse;min-width:980px}
      .member-ledger th,.member-ledger td,.txn-ledger th,.txn-ledger td{padding:12px 13px;border-bottom:1px solid rgba(255,255,255,.055);text-align:left;font-size:11px;vertical-align:top}
      .member-ledger th,.txn-ledger th{color:rgba(255,255,255,.42);font-size:8px;text-transform:uppercase}
      .member-ledger small,.txn-ledger small{display:block;color:rgba(255,255,255,.42);margin-top:4px}
      .status-paid{color:#6ee7b7}.status-partial{color:#fbbf24}.status-due{color:#fca5a5}.status-credit{color:#67e8f9}
      .finance-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      @media(max-width:1100px){.monthly-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.finance-two{grid-template-columns:1fr}}
      @media(max-width:700px){.monthly-kpis{grid-template-columns:1fr}}
    `}</style>

    <div className="content operations-page">
      <div className="heading">
        <div>
          <span className="eyebrow">{project.code} / MEMBERSHIP & PROJECT ECONOMICS</span>
          <h1>Project Finance</h1>
          <p>Membership is simple: every active member owes KES 2,000 per month. Payments are separate transactions and overpayments become credit.</p>
        </div>
      </div>

      <section className="monthly-rule">
        <strong>Current membership law:</strong> every active member = KES 2,000 per month. Every member account and transaction remains below. The headline cash position only shows actual cash collected, opportunity cash, expenses and cash available.
      </section>

      <form className="month-switch" method="get">
        <label>Membership month<input type="month" name="month" defaultValue={selectedMonth}/></label>
        <button>View Month</button>
        <span>{periodLabel(selectedMonth)}</span>
      </form>

      <section className="monthly-kpis">
        <article><span>Cash Collected</span><strong>KES {lifetimeMembershipCollected.toLocaleString("en-KE")}</strong><small>Actual membership cash received</small></article>
        <article><span>Opportunity Revenue Expected</span><strong>KES {opportunityExpected.toLocaleString("en-KE")}</strong><small>Best current value from active opportunities</small></article>
        <article><span>Opportunity Revenue Received</span><strong>KES {commercialReceived.toLocaleString("en-KE")}</strong><small>Commercial cash actually received</small></article>
        <article><span>Expenses Paid</span><strong>KES {paidSpend.toLocaleString("en-KE")}</strong><small>Actual project cash spent</small></article>
        <article><span>Cash Available</span><strong>KES {cashAvailable.toLocaleString("en-KE")}</strong><small>Collected + received opportunity cash − paid expenses</small></article>
        <article><span>Active Opportunities</span><strong>{activeOpportunities.length}</strong><small><a href="/opportunities">Open opportunity pipeline →</a></small></article>
      </section>

      <section className="finance-two">
        <details className="beat-intake-disclosure" open>
          <summary className="beat-intake-summary"><span>PAYMENT TRANSACTION</span><strong>Record a member payment</strong><small>Select any active member. Overpayments are allowed and show as credit.</small><b>Open +</b></summary>
          <form action={recordMembershipPayment} className="panel operations-form">
            <select name="member_user_id" required defaultValue="">
              <option value="" disabled>Choose project member</option>
              {members.map((m:any)=>{
                const p=memberMap.get(m.user_id);
                const a=accountByMember.get(m.user_id);
                const paid=paidByMember.get(m.user_id)||0;
                const position=paid>MONTHLY_FEE
                  ?`credit KES ${(paid-MONTHLY_FEE).toLocaleString("en-KE")}`
                  :paid===MONTHLY_FEE
                  ?"paid"
                  :`outstanding KES ${(MONTHLY_FEE-paid).toLocaleString("en-KE")}`;
                return<option key={m.user_id} value={m.user_id}>{a?.member_code?`${a.member_code} · `:""}{creatorDisplayName(p)} · {position}</option>
              })}
            </select>
            <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Payment amount"/>
            <input name="payment_period" type="month" defaultValue={selectedMonth} required/>
            <input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/>
            <select name="payment_method" defaultValue="M-Pesa"><option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select>
            <input name="payment_reference" placeholder="M-Pesa / bank reference"/>
            <textarea name="note" placeholder="Small note: e.g. extra KES 1,000 paid in advance, confirmed by…"/>
            <button>Record Payment Transaction</button>
          </form>
        </details>

        <article className="panel">
          <span className="eyebrow">OPPORTUNITY PIPELINE</span>
          <h2>Expected commercial cash</h2>
          <p>The expected figure stays outside Cash Available until money is actually received.</p>
          <div className="home-list">
            {!activeOpportunities.length&&<p>No active commercial opportunities recorded.</p>}
            {activeOpportunities.slice(0,6).map((item:any)=>{
              const value=item.contracted_value!=null
                ?Number(item.contracted_value||0)
                :item.negotiated_value!=null
                ?Number(item.negotiated_value||0)
                :Number(item.estimated_value||0);
              return<div key={item.id}>
                <time>{String(item.status||"identified").replaceAll("_"," ")}</time>
                <span>
                  <strong>{item.organisation||item.opportunity_type}</strong>
                  <small>{item.currency||"KES"} {value.toLocaleString("en-KE")}{item.next_action?` · ${item.next_action}`:""}</small>
                </span>
              </div>
            })}
          </div>
          <Link className="secondary-button-inline" href="/opportunities">Open Opportunities →</Link>
        </article>
      </section>

      <section className="platform-home-section">
        <div className="platform-section-heading">
          <div><span className="eyebrow">MEMBER ACCOUNTS · {periodLabel(selectedMonth).toUpperCase()}</span><h2>Who has paid, who owes, who has credit</h2></div>
          <span>KES 2,000 each</span>
        </div>

        <div className="member-ledger">
          <table>
            <thead><tr><th>Member ID / Name</th><th>Monthly Due</th><th>Paid This Month</th><th>Position</th><th>Lifetime Paid</th><th>Latest Note</th></tr></thead>
            <tbody>
              {members.map((m:any)=>{
                const p=memberMap.get(m.user_id);
                const a=accountByMember.get(m.user_id);
                const paid=paidByMember.get(m.user_id)||0;
                const lifetime=lifetimePaidByMember.get(m.user_id)||0;
                const latest=latestTxnByMember.get(m.user_id);
                const outstanding=Math.max(0,MONTHLY_FEE-paid);
                const credit=Math.max(0,paid-MONTHLY_FEE);
                const status=credit>0
                  ?`Paid + Credit KES ${credit.toLocaleString("en-KE")}`
                  :outstanding===0
                  ?"Paid in Full"
                  :paid>0
                  ?`Part Paid · KES ${outstanding.toLocaleString("en-KE")} due`
                  :`KES ${outstanding.toLocaleString("en-KE")} due`;
                const cls=credit>0?"status-credit":outstanding===0?"status-paid":paid>0?"status-partial":"status-due";

                return<tr key={m.user_id}>
                  <td>{a?<Link href={`/finance/members/${a.id}?month=${selectedMonth}`}><strong>{a.member_code} · {creatorDisplayName(p)}</strong></Link>:<strong>{creatorDisplayName(p)}</strong>}<small>{p?.email||""}</small></td>
                  <td>KES 2,000</td>
                  <td>KES {paid.toLocaleString("en-KE")}</td>
                  <td><strong className={cls}>{status}</strong></td>
                  <td>KES {lifetime.toLocaleString("en-KE")}</td>
                  <td>{latest?.note||"—"}{latest&&<small>{latest.transaction_code} · {latest.transaction_date}</small>}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="platform-home-section">
        <div className="platform-section-heading">
          <div><span className="eyebrow">TRANSACTIONS</span><h2>Payment ledger</h2></div>
          <span>{transactions.length} recorded</span>
        </div>

        <div className="txn-ledger">
          <table>
            <thead><tr><th>Transaction</th><th>Payment Month</th><th>Date</th><th>Member</th><th>Amount</th><th>Method / Ref</th><th>Note</th><th>Status</th></tr></thead>
            <tbody>
              {!transactions.length&&<tr><td colSpan={8}>No membership transactions recorded.</td></tr>}
              {transactions.slice(0,150).map((txn:any)=>{
                const a=accountByMember.get(txn.member_user_id);
                const p=memberMap.get(txn.member_user_id);
                return<tr key={txn.id}>
                  <td><Link href={`/finance/transactions/${txn.id}`}><strong>{txn.transaction_code}</strong></Link></td>
                  <td>{txn.payment_period?periodLabel(String(txn.payment_period).slice(0,7)):"—"}</td>
                  <td>{new Date(`${txn.transaction_date}T12:00:00`).toLocaleDateString("en-KE")}</td>
                  <td>{a?<Link href={`/finance/members/${a.id}`}>{a.member_code} · {creatorDisplayName(p)}</Link>:creatorDisplayName(p)}</td>
                  <td>KES {Number(txn.amount||0).toLocaleString("en-KE")}</td>
                  <td>{txn.payment_method}<small>{txn.payment_reference||"No reference"}</small></td>
                  <td>{txn.note||"—"}</td>
                  <td>{txn.status==="reversed"?"REVERSED":"POSTED"}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-two">
        <details className="beat-intake-disclosure">
          <summary className="beat-intake-summary"><span>BUDGET CONTROL</span><strong>Budget & expense</strong><b>Open +</b></summary>
          <form action={saveProjectBudget} className="panel operations-form">
            <input name="budget_amount" type="number" min="0" step="0.01" defaultValue={budgetAmount}/>
            <select name="currency" defaultValue="KES"><option>KES</option><option>USD</option><option>EUR</option></select>
            <button>Save Budget</button>
          </form>
          <form action={addProjectExpense} className="panel operations-form">
            <input name="amount" type="number" min="0.01" step="0.01" placeholder="Expense amount" required/>
            <select name="currency" defaultValue="KES"><option>KES</option><option>USD</option></select>
            <input name="category" required placeholder="Category"/>
            <input name="vendor" placeholder="Vendor / person"/>
            <input name="expense_date" type="date"/>
            <select name="payment_status" defaultValue="committed"><option value="committed">Committed</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select>
            <select name="track_id" defaultValue=""><option value="">Project-wide</option>{tracks.map((t:any)=><option key={t.id} value={t.id}>{t.working_title}</option>)}</select>
            <textarea name="notes" placeholder="Expense note"/>
            <button>Add Expense</button>
          </form>
        </details>

        <details className="beat-intake-disclosure">
          <summary className="beat-intake-summary"><span>COMMERCIAL REVENUE</span><strong>Record non-membership revenue</strong><small>Streaming, sync, radio, TV, brands, live and other income.</small><b>Open +</b></summary>
          <form action={addRevenueRecord} className="panel operations-form">
            <input name="revenue_source" required placeholder="Revenue source"/>
            <input name="amount" type="number" min="0" step="0.01" required placeholder="Amount"/>
            <select name="currency" defaultValue="KES"><option>KES</option><option>USD</option></select>
            <select name="payment_status" defaultValue="expected"><option value="expected">Expected</option><option value="invoiced">Invoiced</option><option value="partially_paid">Partially Paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select>
            <select name="track_id" defaultValue=""><option value="">Project-wide</option>{tracks.map((t:any)=><option key={t.id} value={t.id}>{t.working_title}</option>)}</select>
            <select name="opportunity_id" defaultValue=""><option value="">No linked opportunity</option>{opportunities.map((o:any)=><option key={o.id} value={o.id}>{o.organisation||o.opportunity_type}</option>)}</select>
            <input name="expected_date" type="date"/>
            <input name="received_date" type="date"/>
            <textarea name="notes" placeholder="Revenue note"/>
            <button>Add Revenue Record</button>
          </form>
        </details>
      </section>
    </div>
  </AppShell>;
}
