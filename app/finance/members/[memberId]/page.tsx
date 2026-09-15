import Link from "next/link";
import {notFound} from "next/navigation";
import AppShell from "../../../../components/AppShell";
import {creatorDisplayName} from "../../../../lib/profileIdentity";
import {getWorkspace} from "../../../../lib/workspace";
import {canEditProjectFinance,canViewProjectFinanceReport} from "../../../../lib/financeAccess";
import {recordMembershipPayment} from "../../actions";

const MONTHLY_FEE=2000;

const periodStart=(month:string)=>{
  const safe=/^\d{4}-\d{2}$/.test(month)?month:new Date().toISOString().slice(0,7);
  return `${safe}-01`;
};

const periodLabel=(month:string)=>
  new Date(`${periodStart(month)}T12:00:00`).toLocaleDateString("en-KE",{month:"long",year:"numeric"});

export default async function MembershipMemberPage({
  params,
  searchParams
}:{
  params:Promise<{memberId:string}>,
  searchParams:Promise<{month?:string}>
}){
  const{memberId}=await params;
  const query=await searchParams;
  const selectedMonth=/^\d{4}-\d{2}$/.test(query.month||"")
    ?String(query.month)
    :new Date().toISOString().slice(0,7);
  const selectedPeriod=periodStart(selectedMonth);

  const{admin,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
  }

  const{data:account}=await admin.from("project_membership_accounts")
    .select("*")
    .eq("id",memberId)
    .eq("project_id",project.id)
    .maybeSingle();

  if(!account)notFound();

  const[profileR,transactionsR]=await Promise.all([
    admin.from("profiles").select("id,full_name,stage_name,nickname,email").eq("id",account.member_user_id).maybeSingle(),
    admin.from("project_membership_transactions").select("*").eq("project_id",project.id).eq("account_id",account.id).order("transaction_date",{ascending:false}).order("created_at",{ascending:false})
  ]);

  const profile=profileR.data;
  const transactions=transactionsR.data||[];
  const posted=transactions.filter((x:any)=>x.status==="posted");
  const selected=posted.filter((x:any)=>String(x.payment_period||"").slice(0,10)===selectedPeriod);
  const paidThisMonth=selected.reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
  const lifetimePaid=posted.reduce((sum:number,x:any)=>sum+Number(x.amount||0),0);
  const outstanding=Math.max(0,MONTHLY_FEE-paidThisMonth);
  const credit=Math.max(0,paidThisMonth-MONTHLY_FEE);
  if(!canViewProjectFinanceReport(roles)){
    return<AppShell><div className="content empty-state"><h2>Financial detail is not available for your project role</h2></div></AppShell>;
  }

  const canEdit=canEditProjectFinance(roles);

  const monthTotals=new Map<string,number>();
  posted.forEach((txn:any)=>{
    const month=String(txn.payment_period||txn.transaction_date||"").slice(0,7);
    if(month)monthTotals.set(month,(monthTotals.get(month)||0)+Number(txn.amount||0));
  });

  const monthlyHistory=Array.from(monthTotals.entries()).sort((a,b)=>b[0].localeCompare(a[0]));

  return<AppShell>
    <style>{`
      .member-finance-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}
      .member-finance-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:18px 0}
      .member-finance-kpis article{padding:15px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:rgba(255,255,255,.025)}
      .member-finance-kpis span{display:block;color:rgba(255,255,255,.42);font-size:8px;text-transform:uppercase;font-weight:900}
      .member-finance-kpis strong{display:block;margin-top:6px;font-size:20px}
      .detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .transaction-list{display:grid;gap:9px}
      .transaction-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;padding:14px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.02)}
      .transaction-card small{display:block;color:rgba(255,255,255,.42);margin-top:4px}
      .month-history{display:grid;gap:8px}.month-history-row{display:grid;grid-template-columns:1fr auto auto;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      .credit{color:#67e8f9}.paid{color:#6ee7b7}.due{color:#fca5a5}
      @media(max-width:850px){.member-finance-head,.detail-grid{grid-template-columns:1fr}.member-finance-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.member-finance-kpis{grid-template-columns:1fr}.month-history-row{grid-template-columns:1fr}}
    `}</style>

    <div className="content operations-page">
      <div className="member-finance-head">
        <div>
          <span className="eyebrow">{project.code} / MEMBERSHIP ACCOUNT</span>
          <h1>{account.member_code} · {creatorDisplayName(profile)}</h1>
          <p>{profile?.email||"Project member"} · Standard membership due: KES 2,000 per month.</p>
        </div>
        <Link className="secondary-button-inline" href={`/finance?month=${selectedMonth}`}>← Back to Finance</Link>
      </div>

      <form method="get" style={{display:"flex",gap:9,alignItems:"end",flexWrap:"wrap",marginTop:16}}>
        <label style={{display:"grid",gap:5}}><small>View membership month</small><input type="month" name="month" defaultValue={selectedMonth}/></label>
        <button>View Month</button>
        <strong>{periodLabel(selectedMonth)}</strong>
      </form>

      <section className="member-finance-kpis">
        <article><span>Monthly Due</span><strong>KES 2,000</strong></article>
        <article><span>Paid This Month</span><strong>KES {paidThisMonth.toLocaleString("en-KE")}</strong></article>
        <article><span>Outstanding</span><strong className={outstanding?"due":"paid"}>KES {outstanding.toLocaleString("en-KE")}</strong></article>
        <article><span>Credit</span><strong className={credit?"credit":""}>KES {credit.toLocaleString("en-KE")}</strong></article>
        <article><span>Lifetime Paid</span><strong>KES {lifetimePaid.toLocaleString("en-KE")}</strong></article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <span className="eyebrow">MONTH POSITION</span>
          <h2>{periodLabel(selectedMonth)}</h2>
          {credit>0
            ?<p><strong className="credit">Paid in full + KES {credit.toLocaleString("en-KE")} credit.</strong></p>
            :outstanding===0
            ?<p><strong className="paid">Paid in full.</strong></p>
            :paidThisMonth>0
            ?<p><strong>KES {paidThisMonth.toLocaleString("en-KE")} paid · KES {outstanding.toLocaleString("en-KE")} still due.</strong></p>
            :<p><strong className="due">KES 2,000 due.</strong></p>}
          <p>The system does not change this member's monthly obligation when another payment is recorded.</p>
        </article>

        <article className="panel">
          <span className="eyebrow">PAYMENT ENTRY</span>
          <h2>Record another payment</h2>
          <p>Overpayments are allowed. Anything above KES 2,000 for this month shows as member credit.</p>

          {canEdit?<form action={recordMembershipPayment} className="operations-form">
            <input type="hidden" name="member_user_id" value={account.member_user_id}/>
            <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Payment amount"/>
            <input name="payment_period" type="month" defaultValue={selectedMonth} required/>
            <input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/>
            <select name="payment_method" defaultValue="M-Pesa"><option>M-Pesa</option><option>Cash</option><option>Bank Transfer</option><option>Card</option><option>Other</option></select>
            <input name="payment_reference" placeholder="M-Pesa / bank reference"/>
            <textarea name="note" placeholder="Transaction note, e.g. extra KES 1,000 paid in advance"/>
            <button>Record Payment</button>
          </form>:<p>This account is read-only for your role.</p>}
        </article>
      </section>

      <section className="platform-home-section">
        <div className="platform-section-heading">
          <div><span className="eyebrow">MONTHLY SUMMARY</span><h2>Payment position by month</h2></div>
        </div>

        <div className="month-history">
          {!monthlyHistory.length&&<p>No posted payment history yet.</p>}
          {monthlyHistory.map(([month,amount])=>{
            const out=Math.max(0,MONTHLY_FEE-amount);
            const cred=Math.max(0,amount-MONTHLY_FEE);
            return<div className="month-history-row" key={month}>
              <Link href={`/finance/members/${account.id}?month=${month}`}><strong>{periodLabel(month)}</strong></Link>
              <span>KES {amount.toLocaleString("en-KE")} paid</span>
              <strong className={cred?"credit":out?"due":"paid"}>{cred?`Credit KES ${cred.toLocaleString("en-KE")}`:out?`Due KES ${out.toLocaleString("en-KE")}`:"Paid in Full"}</strong>
            </div>
          })}
        </div>
      </section>

      <section className="platform-home-section">
        <div className="platform-section-heading">
          <div><span className="eyebrow">TRANSACTION HISTORY</span><h2>Every recorded payment</h2></div>
          <span>{transactions.length} record{transactions.length===1?"":"s"}</span>
        </div>

        <div className="transaction-list">
          {!transactions.length&&<p>No transactions recorded.</p>}
          {transactions.map((txn:any)=><Link href={`/finance/transactions/${txn.id}`} className="transaction-card" key={txn.id}>
            <span>
              <strong>{txn.transaction_code} · KES {Number(txn.amount||0).toLocaleString("en-KE")}</strong>
              <small>{txn.payment_period?periodLabel(String(txn.payment_period).slice(0,7)):"Month not recorded"} · {new Date(`${txn.transaction_date}T12:00:00`).toLocaleDateString("en-KE")} · {txn.payment_method}{txn.payment_reference?` · ${txn.payment_reference}`:""}</small>
              <small>{txn.note||"No note recorded."}</small>
            </span>
            <b>{txn.status==="reversed"?"REVERSED":"OPEN →"}</b>
          </Link>)}
        </div>
      </section>
    </div>
  </AppShell>;
}
