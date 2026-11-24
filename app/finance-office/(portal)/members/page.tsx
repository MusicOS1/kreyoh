import Link from "next/link";
import {getThirdCultureMemberFinance} from "../../../../lib/thirdCultureFinance";
import {fmtKES,formatDate} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function ThirdCultureMembers({searchParams}:{
 searchParams:Promise<{q?:string}>}){
 const data=await getThirdCultureMemberFinance();
 const {q=""}=await searchParams;
 const search=q.trim().toLowerCase().slice(0,80);
 const visible=data.members.filter(m=>!search||m.name.toLowerCase().includes(search)||m.email?.toLowerCase().includes(search)||m.memberCode?.toLowerCase().includes(search));
 const countMissing=data.members.filter(m=>!m.accountId).length;
 const totalReceived=data.members.reduce((sum,m)=>sum+m.received,0);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>THIRD CULTURE / MEMBERS</span><h1>Member finance accounts</h1>
   <p>Every active Third Culture project member has a personal record. Contributions stay separate from Third Culture's operating book and each artist's own projects.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office/accounts">All accounts</Link></header>
  <div className={styles.grid4}>
   <div className={styles.stat}><small>Active members</small><strong>{data.members.length}</strong><span>Members of TUKO WATU WENGI</span></div>
   <div className={styles.stat}><small>Finance accounts created</small><strong>{data.accountCount}</strong><span>Existing personal bookkeeping accounts</span></div>
   <div className={styles.stat}><small>Setup still needed</small><strong>{countMissing}</strong><span>No account is invented for an unmatched member</span></div>
   <div className={styles.stat}><small>Contributions posted</small><strong>{fmtKES(totalReceived)}</strong><span>No bank settlement or artist payout implied</span></div>
  </div>
  <div className={styles.note}>A monthly fee setting is <strong>not the same as money owed</strong>. We show actual posted contributions without guessing arrears, refunds, reimbursements or artist earnings.</div>
  <section className={styles.panel}><div className={styles.panelTop}><h2>People and payments</h2><span>{visible.length} people</span></div>
   <form className={styles.searchForm} method="get"><label>Find a member<input name="q" type="search" defaultValue={q} placeholder="Name, email or account code"/></label><button>Search</button></form>
   {visible.length===0?<div className={styles.empty}>No members match this search.</div>:
    <div className={styles.tableWrap}><table className={styles.table}>
    <thead><tr><th>Member</th><th>Account</th><th>Monthly fee setting</th><th>Contributions received</th><th>Latest payment</th><th>Action</th></tr></thead>
    <tbody>{visible.map(m=><tr key={m.userId}>
     <td><strong>{m.name}</strong><small>{m.email||"No email on file"}</small></td>
     <td><span className={m.accountId?styles.statusGood+" "+styles.status:styles.status}>{m.accountId?"Active ledger":"Setup needed"}</span><small>{m.memberCode||"No account code"}</small></td>
     <td>{m.monthlyFee===null?"Not set":fmtKES(m.monthlyFee)}</td>
     <td className={styles.moneyIn}>{fmtKES(m.received)}</td><td>{m.lastPayment?formatDate(m.lastPayment):"No posted payments"}</td>
     <td><Link href={"/finance-office/members/"+m.userId}>Open member →</Link></td>
    </tr>)}</tbody>
   </table></div>}
  </section>
 </main>;
}
