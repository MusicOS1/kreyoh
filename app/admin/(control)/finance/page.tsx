import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {loadFinanceOfficeData,fmtKES,monthlyMovements,formatDate} from "../../../../lib/financeOfficeData";
import FinanceTrend from "../../../../components/FinanceTrend";
import styles from "../../../finance-office/financeUi.module.css";

export default async function FinanceBackOffice(){
 await requireControlRoomPermission("finance");
 const data=await loadFinanceOfficeData();
 const business=data.books.find((b:any)=>b.slug==="fackts_music_platform");
 const businessReady=Boolean(business&&data.bookDataAvailable);
 const businessActivity=businessReady?data.bookEntries.filter((e:any)=>e.book_id===business!.id):[];
 const posted=businessActivity.filter((e:any)=>e.status==="posted");
 const bizIn=posted.filter((e:any)=>e.entry_type==="income").reduce((s:number,e:any)=>s+Number(e.amount_kes||0),0);
 const bizOut=posted.filter((e:any)=>e.entry_type==="expense").reduce((s:number,e:any)=>s+Number(e.amount_kes||0),0);
 const partnerProject=data.projects.find((p:any)=>p.id===data.TUKO_PROJECT_ID);
 const partnerTotals=partnerProject?data.totals.get(partnerProject.id):null;
 const independent=data.projects.filter((p:any)=>p.id!==data.TUKO_PROJECT_ID);
 const latest=data.rows.filter(row=>row.currency==="KES").slice(0,6);
 const series=monthlyMovements(data.rows);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FACKTS MUSIC / FINANCE OFFICE</span>
   <h1>FACKTS Music Finance</h1>
   <p>Your permanent music business first. Third Culture is a separate temporary partner project, and independently owned artist projects keep their own finances.</p>
  </div><Link href="/finance-office/platform" className={styles.button}>Manage FACKTS finances</Link></header>
  <section className={styles.panel} aria-label="Permanent FACKTS Music business finances">
   <div className={styles.panelTop}><div><span className={styles.eyebrow}>PERMANENT BUSINESS · FACKTS MUSIC</span><h2>Our income, expenses and operating costs</h2><p>The FACKTS Music team and future artists continue independently of Third Culture.</p></div>
    <Link href="/finance-office/platform" className={styles.button}>Open business finance</Link></div>
   <div className={styles.grid4}>
    <article className={styles.stat}><small>FACKTS money in</small><strong>{businessReady?fmtKES(bizIn):"Not recorded"}</strong><span>FACKTS business income only</span></article>
    <article className={styles.stat}><small>FACKTS money out</small><strong>{businessReady?fmtKES(bizOut):"Not recorded"}</strong><span>Operating expenses only</span></article>
    <article className={styles.stat}><small>FACKTS recorded movement</small><strong>{businessReady?fmtKES(bizIn-bizOut):"Not recorded"}</strong><span>Not a bank balance or company profit</span></article>
    <article className={styles.stat}><small>Business ledger</small><strong>{businessReady?"Ready":"Setup pending"}</strong><span>{businessReady?"View income, expenses and drafts":"Operating-book migration not yet applied"}</span></article>
   </div>
   <div className={styles.quick}>
    <Link href="/finance-office/platform#record">+ Record FACKTS money in</Link>
    <Link href="/finance-office/platform#record">− Record FACKTS money out</Link>
    <Link href="/finance-office/platform#expenses">Operating expenses & bills</Link>
    <Link href="/finance-office/platform#fackts-business-activity">Business transactions</Link>
   </div>
   {!businessReady&&<div className={styles.note}><strong>Why amounts say “Not recorded”:</strong> the FACKTS operating ledger has not yet been created in the database. We are not borrowing Third Culture contributions or artist-owned project money to fill these business figures.</div>}
  </section>
  <div className={styles.grid2}>
   <section className={styles.panel} aria-label="External Third Culture partnership">
    <span className={styles.eyebrow}>TEMPORARY PARTNER · NOT FACKTS MUSIC</span>
    <h2>Third Culture</h2>
    <p>Our free partner engagement covering TUKO WATU WENGI. It ends when the agreed work is finished; no automatic renewal or new Third Culture project.</p>
    <div className={styles.items}>
     <div className={styles.item}><div><strong>TUKO project receipts</strong><small>Separate partner project ledger</small></div><b>{partnerProject?fmtKES(partnerTotals?.received||0):"Not linked"}</b></div>
     <div className={styles.item}><div><strong>TUKO project expenses</strong><small>Not FACKTS Music business spending</small></div><b>{partnerProject?fmtKES(partnerTotals?.spent||0):"Not linked"}</b></div>
    </div>
    <Link className={styles.buttonSecondary} href="/finance-office/partners/third-culture">Manage partner account</Link>
   </section>
   <section className={styles.panel} aria-label="Independent artist projects">
    <span className={styles.eyebrow}>INDEPENDENT ARTIST PROJECTS</span>
    <h2>Artists we support</h2><p>Other projects remain owned by their creators. Services and commercial opportunities are separate from ownership, and Third Culture memberships do not become a FACKTS Music roster.</p>
    <div className={styles.items}><div className={styles.item}><div><strong>Other project ledgers</strong><small>Shown separately for finance oversight</small></div><b>{independent.length}</b></div></div>
    <div className={styles.quick}><Link href="/finance-office/accounts">View artist project accounts</Link><Link href="/finance-office/payments">Service payments</Link></div>
   </section>
  </div>
  <section className={styles.panel} aria-label="Managed project activity kept separate from FACKTS business income">
   <div className={styles.panelTop}><div><h2>Managed-project activity</h2>
    <p>These are project accounts, including the external partner. They are not FACKTS Music business revenue or expenses.</p></div>
    <Link href="/finance-office/transactions">Project transactions</Link></div>
   <div className={styles.grid4}>
    <article className={styles.stat}><small>Managed-project receipts</small><strong>{fmtKES(data.totalIn)}</strong><span>Not included in FACKTS business income</span></article>
    <article className={styles.stat}><small>Managed-project spending</small><strong>{fmtKES(data.totalOut)}</strong><span>Not included in FACKTS business expenses</span></article>
    <article className={styles.stat}><small>Project ledgers</small><strong>{data.projects.length}</strong><span>Includes Third Culture and independent projects</span></article>
    <article className={styles.stat}><small>Fan payments</small><strong>Not active</strong><span>Separate from service invoices</span></article>
   </div>
   <div className={styles.grid2}>
    <div><h3>Project money in and out</h3><p>Six-month trend of recorded project movements, not the FACKTS business ledger.</p><FinanceTrend data={series}/></div>
    <div><div className={styles.panelTop}><h3>Recent project records</h3><Link href="/finance-office/transactions">See all</Link></div>
     {latest.length?<div className={styles.items}>{latest.map(row=><div className={styles.item} key={row.source+"-"+row.id}>
      <div><strong>{row.description}</strong><small>{data.projects.find((p:any)=>p.id===row.project_id)?.name||"Project"} · {formatDate(row.date)} · {row.verified?"Recorded":row.status}</small></div>
      <b className={row.kind==="income"?styles.moneyIn:styles.moneyOut}>{row.kind==="income"?"+":"−"}{fmtKES(row.amount)}</b>
     </div>)}</div>:<p>No project transactions recorded yet.</p>}
    </div>
   </div>
  </section>
  <section className={styles.panel}><div className={styles.panelTop}><h2>Other Finance tools</h2><p>All the existing tools remain available.</p></div>
   <div className={styles.quick}>
    <Link href="/finance-office/accounts">Accounts</Link>
    <Link href="/finance-office/members">Third Culture member accounts</Link>
    <Link href="/finance-office/bills">Project bills & expenses</Link>
    <Link href="/finance-office/payments">Service payment links</Link>
    <Link href="/finance-office/fan-payments">Fan payments</Link>
    <Link href="/finance-office/reports">Project reports & CSV</Link>
   </div>
  </section>
 </main>;
}
