import Link from "next/link";
import {loadFinanceOfficeData,fmtKES,periodStart} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function FinanceReports({searchParams}:{
 searchParams:Promise<{period?:string}>}){
 const data=await loadFinanceOfficeData(),p=await searchParams;
 const period=["30","90","365","all"].includes(p.period||"")?p.period||"30":"30";
 const from=period!=="all"?periodStart(period).toISOString().slice(0,10):"";
 const all=data.rows.filter(r=>r.verified&&r.currency==="KES"&&(!from||r.date.slice(0,10)>=from));
 const byProject=new Map(data.projects.map((p:any)=>[p.id,{received:0,spent:0}]));
 for(const r of all){const row=byProject.get(r.project_id);if(row)row[r.kind==="income"?"received":"spent"]+=r.amount;}
 const totalIn=all.filter(r=>r.kind==="income").reduce((s,r)=>s+r.amount,0);
 const totalOut=all.filter(r=>r.kind==="expense").reduce((s,r)=>s+r.amount,0);
 return <main className={styles.root}>
   <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / REPORTS</span><h1>Finance reports</h1>
    <p>Understand what was actually recorded, compare projects, and export a spreadsheet-ready CSV.</p></div>
    <Link className={styles.button} href={"/finance-office/reports/export?period="+period}>Download CSV</Link></header>
   <nav className={styles.pills} aria-label="Report period">{[["30","30 days"],["90","90 days"],["365","1 year"],["all","All time"]].map(([v,label])=>
    <Link key={v} className={styles.pill+" "+(period===v?styles.pillActive:"")} href={"/finance-office/reports?period="+v}>{label}</Link>)}</nav>
   <div className={styles.grid4}>
    <div className={styles.stat}><small>Recorded money in</small><strong>{fmtKES(totalIn)}</strong><span>Verified/project-posted KES movements</span></div>
    <div className={styles.stat}><small>Paid expenses</small><strong>{fmtKES(totalOut)}</strong><span>No outstanding bills included</span></div>
    <div className={styles.stat}><small>Net recorded movement</small><strong>{fmtKES(totalIn-totalOut)}</strong><span>Not bank balance or profit</span></div>
    <div className={styles.stat}><small>Records included</small><strong>{all.length}</strong><span>Excludes unverified transactions</span></div>
   </div>
   <div className={styles.note}>The CSV includes each project's recorded income and expenses for the selected period. FACKTS Music and Third Culture operating books are separate and not counted as artist project earnings. Member reimbursements, royalty liabilities and actual settlement amounts are not calculated without verified source records.</div>
   <section className={styles.panel}><div className={styles.panelTop}><h2>Platform and Third Culture operating books</h2><Link href="/finance-office/accounts">Open accounts</Link></div>
    <p>These are separate books and are not included in the project totals above.</p>
    <div className={styles.items}>{data.financeBooks.map(b=>{
     const book=data.books.find((item:any)=>item.slug===b.slug);
     const value=book?data.bookTotals.get(book.id):null;
     return <Link className={styles.item} href={"/finance-office/books/"+b.slug} key={b.slug}>
      <div><strong>{b.name}</strong><small>{data.bookReady?"Posted operating records":"Account setup not approved"}</small></div>
      <b>{data.bookReady?fmtKES((value?.income||0)-(value?.expense||0)):"Setup pending"}</b>
     </Link>;
    })}</div>
   </section>
   <section className={styles.panel}><h2>Project performance</h2>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Project</th><th>Financial owner</th><th>Money in</th><th>Money out</th><th>Net movement</th></tr></thead>
     <tbody>{data.projects.map((p:any)=>{const t=byProject.get(p.id)||{received:0,spent:0};return <tr key={p.id}>
      <td><strong>{p.name}</strong><small>{p.code}</small></td>
      <td>{p.id===data.TUKO_PROJECT_ID?"Third Culture":data.ownerById.get(p.owner_id)||"Owner to confirm"}</td>
      <td className={styles.moneyIn}>{fmtKES(t.received)}</td><td className={styles.moneyOut}>{fmtKES(t.spent)}</td>
      <td>{fmtKES(t.received-t.spent)}</td>
     </tr>})}</tbody></table></div>
   </section>
 </main>;
}
