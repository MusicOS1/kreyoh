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
   <div className={styles.stat}><small>Missing finance records</small><strong>{countMissing}</strong><span>Active members whose bookkeeping records have not yet been created</span></div>
   <div className={styles.stat}><small>Contributions posted</small><strong>{fmtKES(totalReceived)}</strong><span>No bank settlement or artist payout implied</span></div>
  </div>
  <div className={styles.note}><strong>Missing finance record</strong> means the member is already active but their personal contribution ledger has not yet been created. It is not an unpaid bill or a blocked login. A monthly fee setting does <strong>not</strong> establish debt.</div>
  <section className={styles.panel}><div className={styles.panelTop}><h2>People and payments</h2><span>{visible.length} people</span></div>
   <form className={styles.searchForm} method="get"><label>Find a member<input name="q" type="search" defaultValue={q} placeholder="Name, email or account code"/></label><button>Search</button></form>
   {visible.length===0?<div className={styles.empty}>No members match this search.</div>:<>
    <div className={styles.mobileMemberList} aria-label="Members and finance details on mobile">{visible.map(m=><article className={styles.mobileMemberCard} key={m.userId}>
      <div className={styles.mobileMemberTop}><div><strong>{m.name}</strong><small>{m.email||"No email on file"}</small></div>
       <span className={m.accountId?styles.status+" "+styles.statusGood:styles.status}>{m.accountId?"Ledger ready":"Record missing"}</span></div>
      <div className={styles.mobileMemberFacts}>
       <div><span>Monthly setting</span><strong>{m.monthlyFee===null?"Not set":fmtKES(m.monthlyFee)}</strong></div>
       <div><span>Contributions posted</span><strong className={styles.moneyIn}>{fmtKES(m.received)}</strong></div>
       <div><span>Last contribution</span><strong>{m.lastPayment?formatDate(m.lastPayment):"None recorded"}</strong></div>
      </div>
      <small>{m.memberCode||"No finance ledger code yet. Membership is still active."}</small>
      <Link className={styles.button} href={"/finance-office/members/"+m.userId}>Open member finance record</Link>
    </article>)}</div>
    <div className={styles.memberDesktopTable+" "+styles.tableWrap}><table className={styles.table}>
    <thead><tr><th>Member</th><th>Account</th><th>Monthly fee setting</th><th>Contributions received</th><th>Latest payment</th><th>Action</th></tr></thead>
    <tbody>{visible.map(m=><tr key={m.userId}>
     <td><strong>{m.name}</strong><small>{m.email||"No email on file"}</small></td>
     <td><span className={m.accountId?styles.statusGood+" "+styles.status:styles.status}>{m.accountId?"Finance ledger ready":"Record missing"}</span><small>{m.memberCode||"Member active · finance ledger not created"}</small></td>
     <td>{m.monthlyFee===null?"Not set":fmtKES(m.monthlyFee)}</td>
     <td className={styles.moneyIn}>{fmtKES(m.received)}</td><td>{m.lastPayment?formatDate(m.lastPayment):"No posted payments"}</td>
     <td><Link href={"/finance-office/members/"+m.userId}>Open member →</Link></td>
    </tr>)}</tbody>
   </table></div></>}
  </section>
 </main>;
}
