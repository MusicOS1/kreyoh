import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {loadFinanceOfficeData,fmtKES,monthlyMovements,formatDate} from "../../../../lib/financeOfficeData";
import FinanceTrend from "../../../../components/FinanceTrend";
import styles from "../../../finance-office/financeUi.module.css";

export default async function FinanceBackOffice(){
 await requireControlRoomPermission("finance");
 const data=await loadFinanceOfficeData();
 const series=monthlyMovements(data.rows);
 const latest=data.rows.filter(row=>row.currency==="KES").slice(0,6);
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FACKTS MUSIC / FINANCE OFFICE</span>
   <h1>Finance overview</h1><p>One place to manage separate FACKTS Music, Third Culture and music-project accounts. All amounts come from actual records.</p>
  </div><Link href="/finance-office/transactions" className={styles.button}>View transactions</Link></header>
  <div className={styles.grid4}>
   <article className={styles.stat}><small>Recorded money received</small><strong>{fmtKES(data.totalIn)}</strong><span>Paid project revenue and posted member contributions</span></article>
   <article className={styles.stat}><small>Recorded money spent</small><strong>{fmtKES(data.totalOut)}</strong><span>Paid expenses in the project books</span></article>
   <article className={styles.stat}><small>Net recorded movement</small><strong>{fmtKES(data.totalIn-data.totalOut)}</strong><span>Not an available bank balance or artist earnings</span></article>
   <article className={styles.stat}><small>Music project accounts</small><strong>{data.projects.length}</strong><span>Each project has its own ledger and owner</span></article>
  </div>
  <div className={styles.note}>Figures represent recorded movements. They are <strong>not</strong> bank balances, cash available for withdrawal, payouts or consolidated company profit. Operating books are separate from each project's records.</div>
  <div className={styles.grid2}>
   <section className={styles.panel}><div className={styles.panelTop}><h2>Money in vs. money out</h2><Link href="/finance-office/reports">Reports</Link></div><p>Last six calendar months · verified and posted project records</p><FinanceTrend data={series}/></section>
   <section className={styles.panel}><div className={styles.panelTop}><h2>Account overview</h2><Link href="/finance-office/accounts">All accounts</Link></div>
    <div className={styles.items}>{data.financeBooks.map(book=>{
      const matched=data.books.find((b:any)=>b.slug===book.slug);
      const totals=matched?data.bookTotals.get(matched.id):null;
      return <Link key={book.slug} href={"/finance-office/books/"+book.slug} className={styles.item}>
       <div><strong>{book.name}</strong><small>{book.slug==="third_culture"?"Organisation account":"Platform operating account"} · Separate book</small></div>
       <b>{data.bookReady?fmtKES((totals?.income||0)-(totals?.expense||0)):"Setup pending"}</b>
      </Link>})}
     {data.projects.map((p:any)=>{
      const total=data.totals.get(p.id);
      return <Link href={"/finance-office/projects/"+p.id} className={styles.item} key={p.id}>
       <div><strong>{p.name}</strong><small>{p.id===data.TUKO_PROJECT_ID?"Third Culture-managed project":data.ownerById.get(p.owner_id)||"Owner to confirm"} · Project ledger</small></div>
       <b>{fmtKES(total?.net||0)}</b></Link>;
     })}</div>
   </section>
  </div>
  <div className={styles.grid2}>
   <section className={styles.panel}><div className={styles.panelTop}><h2>Recent transactions</h2><Link href="/finance-office/transactions">See all</Link></div>
    {latest.length===0?<p>No project transactions recorded yet.</p>:
     <div className={styles.items}>{latest.map(row=><div className={styles.item} key={row.source+"-"+row.id}>
       <div><strong>{row.description}</strong><small>{data.projects.find((p:any)=>p.id===row.project_id)?.name||"Project"} · {formatDate(row.date)} · {row.verified?"Recorded":row.status}</small></div>
       <b className={row.kind==="income"?styles.moneyIn:styles.moneyOut}>{row.kind==="income"?"+":"−"}{fmtKES(row.amount)}</b>
     </div>)}</div>}
   </section>
   <section className={styles.panel}><h2>Quick actions</h2>
    <div className={styles.quick}>
     <Link href="/finance-office/accounts">▣ Open an account</Link>
     <Link href="/finance-office/members">♙ Third Culture members</Link>
     <Link href="/finance-office/payments">↗ Payment links & status</Link>
     <Link href="/finance-office/transactions">⇄ Money in and out</Link>
     <Link href="/finance-office/bills">▤ Bills & expenses</Link>
     <Link href="/finance-office/reports">▥ Export finance report</Link>
     <Link href="/finance-office/books/fackts_music_platform">＋ Record operating costs</Link>
    </div>
    <p>Finance records belong to their own accounts. Payment processing and new entries remain disabled in preview until approved.</p>
   </section>
  </div>
 </main>;
}
