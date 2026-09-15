import Link from "next/link";
import {notFound} from "next/navigation";
import AppShell from "../../../../components/AppShell";
import {creatorDisplayName} from "../../../../lib/profileIdentity";
import {getWorkspace} from "../../../../lib/workspace";
import {canEditProjectFinance,canViewProjectFinanceReport} from "../../../../lib/financeAccess";
import {reverseMembershipPayment} from "../../actions";


const periodLabel=(value:string|null|undefined)=>{
  const month=String(value||"").slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(month))return"Not recorded";
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-KE",{month:"long",year:"numeric"});
};

export default async function MembershipTransactionPage({
  params
}:{
  params:Promise<{transactionId:string}>
}){
  const{transactionId}=await params;
  const{admin,project,membership,roles}=await getWorkspace();

  if(!project||!membership){
    return<AppShell><div className="content empty-state"><h2>Project access required</h2></div></AppShell>;
  }

  const{data:txn}=await admin.from("project_membership_transactions")
    .select("*")
    .eq("id",transactionId)
    .eq("project_id",project.id)
    .maybeSingle();

  if(!txn)notFound();

  const[accountR,memberR,recorderR,reverserR]=await Promise.all([
    admin.from("project_membership_accounts").select("*").eq("id",txn.account_id).maybeSingle(),
    admin.from("profiles").select("id,full_name,stage_name,nickname,email").eq("id",txn.member_user_id).maybeSingle(),
    admin.from("profiles").select("id,full_name,stage_name,nickname,email").eq("id",txn.recorded_by).maybeSingle(),
    txn.reversed_by
      ?admin.from("profiles").select("id,full_name,stage_name,nickname,email").eq("id",txn.reversed_by).maybeSingle()
      :Promise.resolve({data:null})
  ]);

  const account=accountR.data;
  const member=memberR.data;
  const recorder=recorderR.data;
  const reverser=(reverserR as any).data;
  if(!canViewProjectFinanceReport(roles)){
    return<AppShell><div className="content empty-state"><h2>Financial detail is not available for your project role</h2></div></AppShell>;
  }

  const canEdit=canEditProjectFinance(roles);

  return<AppShell>
    <style>{`
      .txn-detail{max-width:1000px}.txn-hero{padding:24px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:radial-gradient(circle at 90% 10%,rgba(249,115,22,.12),transparent 30%),rgba(255,255,255,.025)}
      .txn-hero h1{margin:6px 0 10px;font-size:clamp(34px,5vw,58px);letter-spacing:-.04em}.txn-amount{font-size:32px;font-weight:900}
      .txn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.txn-grid article{padding:16px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.02)}
      .txn-grid span{display:block;color:rgba(255,255,255,.4);font-size:8px;text-transform:uppercase;font-weight:900}.txn-grid strong,.txn-grid p{display:block;margin-top:6px}
      @media(max-width:700px){.txn-grid{grid-template-columns:1fr}}
    `}</style>

    <div className="content operations-page txn-detail">
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <Link className="secondary-button-inline" href="/finance">← Finance</Link>
        {account&&<Link className="secondary-button-inline" href={`/finance/members/${account.id}`}>← {account.member_code} · {creatorDisplayName(member)}</Link>}
      </div>

      <section className="txn-hero">
        <span className="eyebrow">{txn.status==="reversed"?"REVERSED TRANSACTION":"MEMBERSHIP PAYMENT"}</span>
        <h1>{txn.transaction_code}</h1>
        <div className="txn-amount">KES {Number(txn.amount||0).toLocaleString("en-KE")}</div>
        <p>{creatorDisplayName(member)} · payment for {periodLabel(txn.payment_period)}</p>
      </section>

      <section className="txn-grid">
        <article><span>Member ID</span><strong>{account?.member_code||"—"}</strong></article>
        <article><span>Member</span><strong>{creatorDisplayName(member)}</strong><p>{member?.email||""}</p></article>
        <article><span>Membership Month</span><strong>{periodLabel(txn.payment_period)}</strong></article>
        <article><span>Transaction Date</span><strong>{new Date(`${txn.transaction_date}T12:00:00`).toLocaleDateString("en-KE")}</strong></article>
        <article><span>Payment Method</span><strong>{txn.payment_method}</strong></article>
        <article><span>Payment Reference</span><strong>{txn.payment_reference||"Not recorded"}</strong></article>
        <article><span>Status</span><strong>{String(txn.status).toUpperCase()}</strong></article>
        <article><span>Recorded By</span><strong>{creatorDisplayName(recorder)}</strong><p>{new Date(txn.created_at).toLocaleString("en-KE")}</p></article>
        <article style={{gridColumn:"1 / -1"}}><span>Transaction Note</span><p>{txn.note||"No note recorded."}</p></article>

        {txn.source_legacy_fee_id&&<article style={{gridColumn:"1 / -1"}}><span>Legacy Source</span><p>This transaction was imported from the previous membership fee system. The old system stored cumulative payment figures rather than a separate row for every historic payment event.</p></article>}

        {txn.status==="reversed"&&<article style={{gridColumn:"1 / -1"}}><span>Reversal</span><p>{txn.reversal_reason||"No reason recorded."}</p><p>{reverser?`Reversed by ${creatorDisplayName(reverser)}`:""}{txn.reversed_at?` · ${new Date(txn.reversed_at).toLocaleString("en-KE")}`:""}</p></article>}
      </section>

      {canEdit&&txn.status==="posted"&&<details className="beat-intake-disclosure" style={{marginTop:16}}>
        <summary className="beat-intake-summary"><span>CORRECTION</span><strong>Reverse this transaction</strong><small>Transactions are never deleted. The reversal remains in the audit trail.</small><b>Open +</b></summary>
        <form action={reverseMembershipPayment} className="panel operations-form">
          <input type="hidden" name="transaction_id" value={txn.id}/>
          <textarea name="reversal_reason" required placeholder="Why is this transaction being reversed?"/>
          <button>Reverse Transaction</button>
        </form>
      </details>}
    </div>
  </AppShell>;
}
