import Link from "next/link";
import {notFound} from "next/navigation";
import {TUKO_PROJECT_ID} from "../../../../../lib/financeBackoffice";
import {loadDetailedFinanceReport,reportPeriod,filteredReport,groupReport,reportTotals} from "../../../../../lib/detailedFinanceReport";
import {fmtKES} from "../../../../../lib/financeOfficeData";
import styles from "../../../financeUi.module.css";
export const dynamic="force-dynamic";
export default async function DetailedFinanceReports({searchParams}:{searchParams:Promise<{project?:string;period?:string;from?:string;to?:string;q?:string}>}){
 const p=await searchParams,project=p.project||TUKO_PROJECT_ID;
 const data=await loadDetailedFinanceReport(project);if(!data)notFound();
 const range=reportPeriod(p.period,p.from,p.to),q=p.q||"",rows=filteredReport(data.rows,range,q);
 const totals=reportTotals(rows),book=reportTotals(rows,"Partner operating book");
 const title=project===TUKO_PROJECT_ID?"Third Culture":data.project.name;
 const url=(period:string)=>"/finance-office/reports/detail?"+new URLSearchParams({project,period,...(q?{q}:{})}).toString();
 const download="/finance-office/reports/detail/export?"+new URLSearchParams({project,period:range.period,from:p.from||"",to:p.to||"",q}).toString();
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / PROJECT REPORT</span><h1>{title} — full report</h1><p>{data.project.name} · Transaction register grouped by ledger posting month (Africa/Nairobi).</p></div>
   <div className={styles.pills}><Link className={styles.buttonSecondary} href="/finance-office/reports">All project reports</Link>{!range.invalid&&<a className={styles.button} href={download}>Download full CSV</a>}</div></header>
  <nav className={styles.pills} aria-label="Report period">{[["7","7 days"],["30","30 days"],["90","90 days"],["365","1 year"],["all","All time"]].map(([v,label])=><Link key={v} href={url(v)} className={styles.pill+" "+(range.period===v?styles.pillActive:"")}>{label}</Link>)}</nav>
  <section className={styles.panel}><form method="get" className={styles.searchForm}><input type="hidden" name="project" value={project}/><label>Period<select name="period" defaultValue={range.period}>{[["7","7 days"],["30","30 days"],["90","90 days"],["365","1 year"],["all","All time"],["custom","Custom dates"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>From<input type="date" name="from" defaultValue={p.from||""}/></label><label>To<input type="date" name="to" defaultValue={p.to||""}/></label><label>Search<input name="q" defaultValue={q} placeholder="ID, payer, reference or purpose"/></label><button type="submit">Apply</button></form></section>
  {range.invalid?<p role="alert">Choose valid custom dates with the start on or before the end.</p>:<>
  <p>{range.from||"Earliest record"} – {range.to||"All recorded dates"}</p>
  <div className={styles.grid4}><div className={styles.stat}><small>Project posted income</small><strong>{fmtKES(totals.income/100)}</strong></div><div className={styles.stat}><small>Project paid expenses</small><strong>{fmtKES(totals.expense/100)}</strong></div><div className={styles.stat}><small>Project net recorded</small><strong>{fmtKES((totals.income-totals.expense)/100)}</strong></div><div className={styles.stat}><small>Records shown</small><strong>{rows.length}</strong></div></div>
  <div className={styles.note}>These are ledger amounts, not independently verified bank deposits. Repeated or mismatched receipt references are flagged for review; recorded entries remain unchanged. Pending, failed and reversed entries and membership revenue copies do not increase posted totals. Payment attempts are not counted again as revenue. Dates are ledger dates, not necessarily the provider receipt dates.</div>
  {project===TUKO_PROJECT_ID&&<div className={styles.note}><strong>Separate Third Culture operating book:</strong> {data.bookAvailable?("Income "+fmtKES(book.income/100)+" · Expenses "+fmtKES(book.expense/100)):"Unavailable — no operating-book totals shown"}. Not combined with project money.</div>}
  {!rows.length&&<p>No matching records.</p>}
  {groupReport(rows).map(([month,items])=>{const t=reportTotals(items),b=reportTotals(items,"Partner operating book");return <section className={styles.panel} key={month}><h2>{month}</h2><p>{items.length} records · Project income {fmtKES(t.income/100)} · Expenses {fmtKES(t.expense/100)} · Net {fmtKES((t.income-t.expense)/100)}</p>{items.some(r=>r.ledger==="Partner operating book")&&<p>Separate operating book: income {fmtKES(b.income/100)} · expenses {fmtKES(b.expense/100)}</p>}
   <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Transaction ID</th><th>Payer / payee</th><th>Payment reference</th><th>Purpose / ledger</th><th>Amount</th><th>Status / review</th></tr></thead><tbody>{items.map(r=><tr key={r.ledger+"-"+r.id}><td>{r.date||"Not recorded"}</td><td style={{overflowWrap:"anywhere"}}><strong>{r.code}</strong>{r.id!==r.code&&<small>{r.id}</small>}</td><td>{r.party}</td><td style={{overflowWrap:"anywhere"}}>{r.reference||"Not recorded"}<small>{r.method||"Method not recorded"}</small></td><td>{r.purpose}<small>{r.ledger}</small></td><td className={r.kind==="income"?styles.moneyIn:styles.moneyOut}>{r.kind==="expense"?"−":""}{r.currency} {r.amount.toLocaleString("en-KE",{maximumFractionDigits:2})}</td><td>{r.status}<small>{r.counted?"Posted ledger":"Excluded from posted totals"}</small>{r.warning&&<small>{r.warning}</small>}</td></tr>)}</tbody></table></div></section>})}
  </>}
 </main>;
}
