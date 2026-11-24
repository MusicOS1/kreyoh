import Link from "next/link";
import {loadFinanceOfficeData,fmtKES} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function AccountsPage(){
 const data=await loadFinanceOfficeData();
 const business=data.books.find((b:any)=>b.slug==="fackts_music_platform");
 const businessReady=Boolean(business&&data.bookDataAvailable);
 const businessTotals=businessReady?data.bookTotals.get(business!.id):null;
 const partner=data.books.find((b:any)=>b.slug==="third_culture");
 const partnerReady=Boolean(partner&&data.bookDataAvailable);
 const partnerTotals=partnerReady?data.bookTotals.get(partner!.id):null;
 const tuko=data.projects.find((p:any)=>p.id===data.TUKO_PROJECT_ID);
 const tukoTotals=tuko?data.totals.get(tuko.id):null;
 const independent=data.projects.filter((p:any)=>p.id!==data.TUKO_PROJECT_ID);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / ACCOUNTS</span><h1>Separate finance accounts</h1>
   <p>FACKTS Music is the permanent business. Third Culture is a temporary partner. Artist projects retain their original ownership and separate books.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office">Overview</Link></header>
  <div className={styles.note}>Finance accounts here are <strong>bookkeeping ledgers</strong>, not new bank accounts. Neither Third Culture receipts nor independent artists' collections automatically become FACKTS Music income.</div>
  <section className={styles.panel} aria-label="FACKTS Music permanent business account">
   <div className={styles.panelTop}><div><span className={styles.eyebrow}>01 · OUR PERMANENT BUSINESS</span>
     <h2>FACKTS Music</h2><p>Platform operations, our own artist business, service income, expenses and team costs.</p></div>
    <Link className={styles.button} href="/finance-office/platform">Manage FACKTS finances</Link></div>
   <div className={styles.grid4}>
    <div className={styles.stat}><small>Money in</small><strong>{businessReady?fmtKES(businessTotals?.income||0):"Not recorded"}</strong><span>FACKTS records only</span></div>
    <div className={styles.stat}><small>Money out</small><strong>{businessReady?fmtKES(businessTotals?.expense||0):"Not recorded"}</strong><span>FACKTS costs only</span></div>
    <div className={styles.stat}><small>Net movement</small><strong>{businessReady?fmtKES((businessTotals?.income||0)-(businessTotals?.expense||0)):"Not recorded"}</strong><span>Not bank balance</span></div>
    <div className={styles.stat}><small>Operating book</small><strong>{businessReady?"Ready":"Setup pending"}</strong><span>Migration not yet approved</span></div>
   </div>
   <div className={styles.quick}><Link href="/finance-office/platform#record">Record income or expenses</Link><Link href="/finance-office/platform#fackts-business-activity">Business transactions</Link></div>
  </section>
  <section className={styles.panel} aria-label="Third Culture external partner account">
   <div className={styles.panelTop}><div><span className={styles.eyebrow}>02 · EXTERNAL TEMPORARY PARTNER</span>
    <h2>Third Culture</h2><p>Partner engagement only. Separate Third Culture organisation account and the linked TUKO WATU WENGI project.</p></div>
    <Link className={styles.buttonSecondary} href="/finance-office/partners/third-culture">Partner finance</Link></div>
   <div className={styles.grid4}>
    <div className={styles.stat}><small>Third Culture book</small><strong>{partnerReady?fmtKES((partnerTotals?.income||0)-(partnerTotals?.expense||0)):"Setup pending"}</strong><span>Independent partner book</span></div>
    <div className={styles.stat}><small>TUKO project receipts</small><strong>{tuko?fmtKES(tukoTotals?.received||0):"Not linked"}</strong><span>Not FACKTS business income</span></div>
    <div className={styles.stat}><small>TUKO project expenses</small><strong>{tuko?fmtKES(tukoTotals?.spent||0):"Not linked"}</strong><span>Not FACKTS business costs</span></div>
    <div className={styles.stat}><small>Engagement</small><strong>Temporary</strong><span>No automatic renewal or new project</span></div>
   </div>
   <div className={styles.quick}><Link href="/finance-office/members">Third Culture members</Link>{tuko&&<Link href={"/finance-office/projects/"+tuko.id}>TUKO project ledger</Link>}</div>
  </section>
  <section className={styles.panel} id="projects" aria-label="Independent artist project accounts">
   <div className={styles.panelTop}><div><span className={styles.eyebrow}>03 · CREATOR-OWNED PROJECTS</span><h2>Other music project accounts</h2>
    <p>Projects opened by their respective creators retain independent finance records. No artist is automatically counted as a FACKTS-owned act.</p></div>
    <strong>{independent.length} projects</strong></div>
   {independent.length===0?<div className={styles.empty}>No other project accounts are recorded.</div>:
    <div className={styles.tableWrap}><table className={styles.table}>
     <thead><tr><th>Project</th><th>Recorded project owner</th><th>Money in</th><th>Money out</th><th>Action</th></tr></thead>
     <tbody>{independent.map((p:any)=>{const totals=data.totals.get(p.id);return <tr key={p.id}>
      <td><strong>{p.name}</strong><small>{p.code||"Project"}</small></td>
      <td>{data.ownerById.get(p.owner_id)||"Owner to confirm"}</td>
      <td className={styles.moneyIn}>{fmtKES(totals?.received||0)}</td><td className={styles.moneyOut}>{fmtKES(totals?.spent||0)}</td>
      <td><Link href={"/finance-office/projects/"+p.id}>Open ledger →</Link></td>
     </tr>})}</tbody></table></div>}
  </section>
 </main>;
}
