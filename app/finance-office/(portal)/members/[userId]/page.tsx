import Link from "next/link";
import {notFound} from "next/navigation";
import {getThirdCultureMemberFinance} from "../../../../../lib/thirdCultureFinance";
import {fmtKES,formatDate} from "../../../../../lib/financeOfficeData";
import {financeWritesEnabled} from "../../../../../lib/financeBackoffice";
import {createThirdCultureMemberAccount,recordMemberContribution} from "../../actions";
import styles from "../../../financeUi.module.css";
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export default async function CultureMemberDetail({params}:{
 params:Promise<{userId:string}>}){
 const {userId}=await params;if(!uuid.test(userId))notFound();
 const data=await getThirdCultureMemberFinance();
 const member=data.members.find(m=>m.userId===userId);
 if(!member)notFound();
 const payments=data.transactions.filter((r:any)=>r.member_user_id===userId);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>THIRD CULTURE / MEMBER ACCOUNT</span>
   <h1>{member.name}</h1><p>{member.email||"No email"} · {member.memberCode||"Finance ledger not yet created"}</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office/members">All members</Link></header>
  <div className={styles.grid4}>
   <div className={styles.stat}><small>Posted contributions</small><strong>{fmtKES(member.received)}</strong><span>{member.payments} confirmed record(s)</span></div>
   <div className={styles.stat}><small>Monthly fee setting</small><strong>{member.monthlyFee===null?"Not set":fmtKES(member.monthlyFee)}</strong><span>Does not calculate debt</span></div>
   <div className={styles.stat}><small>Historic allocation record</small><strong>{member.allocated===null?"Not set":fmtKES(member.allocated)}</strong><span>Not artist earnings or payable money</span></div>
   <div className={styles.stat}><small>Account status</small><strong>{member.accountId?member.needsReconciliation?"Check records":"Active":"Record missing"}</strong><span>{member.lastPayment?"Last posted "+formatDate(member.lastPayment):"No payments posted"}</span></div>
  </div>
  {!member.accountId&&<section className={styles.panel}>
    <h2>Set up this member's finance account</h2><p>This person is already an active Third Culture project member. A Finance leader can create their bookkeeping account once writes are approved; no monthly debt or balance will be assumed.</p>
    <form action={createThirdCultureMemberAccount}><input type="hidden" name="user_id" value={userId}/>
      <button className={styles.button} type="submit" disabled={!financeWritesEnabled()}>{financeWritesEnabled()?"Create member finance account":"Setup disabled in preview"}</button>
    </form>
   </section>}
  <div className={styles.note}>This is a personal membership record within Third Culture's managed project. It is not the member's bank account, personal wallet, royalties statement or an authorisation to pay them out. Reimbursements and artist allocations require verified records and approval.</div>
  <section className={styles.panel}><h2>Record a verified member contribution</h2>
    <p>This records an actual contribution against the member's Third Culture project ledger. Check the payment evidence first; a manual entry does not verify bank settlement.</p>
    {!financeWritesEnabled()&&<div className={styles.note}>Live contribution posting is locked in this preview. No real money or member records will change.</div>}
    <form action={recordMemberContribution} className={styles.searchForm}>
      <input type="hidden" name="user_id" value={userId}/>
      <label>Amount KES<input type="number" name="amount_kes" min="0.01" step="0.01" max="10000000" required disabled={!financeWritesEnabled()||!member.accountId}/></label>
      <label>Payment method<select name="payment_method" disabled={!financeWritesEnabled()||!member.accountId}><option>M-PESA</option><option>Bank transfer</option><option>Cash</option><option>Other</option></select></label>
      <label>Payment date<input type="date" name="transaction_date" required disabled={!financeWritesEnabled()||!member.accountId}/></label>
      <label>Fee period (optional)<input type="month" name="payment_period" disabled={!financeWritesEnabled()||!member.accountId}/></label>
      <label>Receipt/reference<input name="payment_reference" required maxLength={110} disabled={!financeWritesEnabled()||!member.accountId} placeholder="M-PESA / bank receipt reference"/></label>
      <label style={{minWidth:"100%",flexBasis:"100%"}}><span><input name="proof_checked" type="checkbox" value="confirmed" required disabled={!financeWritesEnabled()||!member.accountId}/> I checked the supporting receipt</span></label>
      <button type="submit" disabled={!financeWritesEnabled()||!member.accountId}>Record contribution</button>
    </form>
   </section>
  <section className={styles.panel}><h2>Contribution history</h2>
   {!payments.length?<div className={styles.empty}>No contribution transactions recorded for this member.</div>:
    <div className={styles.tableWrap}><table className={styles.table}>
      <thead><tr><th>Date</th><th>Period</th><th>Amount</th><th>Method / reference</th><th>Status</th></tr></thead>
      <tbody>{payments.map((r:any)=><tr key={r.id}><td>{formatDate(r.transaction_date)}</td>
       <td>{r.payment_period?formatDate(r.payment_period):"Not linked to a period"}</td>
       <td className={r.status==="posted"?styles.moneyIn:styles.moneyOut}>{r.currency} {Number(r.amount||0).toLocaleString("en-KE")}</td>
       <td>{r.payment_method||"Not recorded"}<small>{r.payment_reference||r.transaction_code}</small></td>
       <td><span className={r.status==="posted"?styles.status+" "+styles.statusGood:styles.status}>{r.status}</span></td>
      </tr>)}</tbody>
    </table></div>}
  </section>
 </main>;
}
