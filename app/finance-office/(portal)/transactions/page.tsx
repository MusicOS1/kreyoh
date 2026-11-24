import Link from "next/link";
import {loadFinanceOfficeData,fmtKES,formatDate,periodStart} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function AllTransactions({searchParams}:{
 searchParams:Promise<{q?:string;type?:string;period?:string;project?:string}>}){
 const data=await loadFinanceOfficeData();
 const params=await searchParams;
 const q=(params.q||"").trim().toLowerCase().slice(0,80);
 const type=["all","income","expense","unverified"].includes(params.type||"")?params.type||"all":"all";
 const period=["30","90","365","all"].includes(params.period||"")?params.period||"all":"all";
 const project=data.projects.some((p:any)=>p.id===params.project)?params.project||"":"";
 const from=period!=="all"?periodStart(period).toISOString().slice(0,10):"";
 const rows=data.rows.filter(row=>
  (type==="all"||type==="unverified"&&!row.verified||row.kind===type)&&
  (!from||row.date.slice(0,10)>=from)&&
  (!project||row.project_id===project)&&
  (!q||row.description.toLowerCase().includes(q)||data.projects.find((p:any)=>p.id===row.project_id)?.name.toLowerCase().includes(q))
 );
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / TRANSACTIONS</span><h1>Money in & money out</h1><p>Search real project income, member contributions and expenses. Pending records remain clearly separate.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office/reports">Export report</Link></header>
  <section className={styles.panel}><form method="get" className={styles.searchForm}>
   <label>Search<input type="search" name="q" defaultValue={params.q||""} placeholder="Project or transaction"/></label>
   <label>Type<select name="type" defaultValue={type}><option value="all">All records</option><option value="income">Money in</option><option value="expense">Money out</option><option value="unverified">Unverified</option></select></label>
   <label>Period<select name="period" defaultValue={period}><option value="all">All dates</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></label>
   <label>Project<select name="project" defaultValue={project}><option value="">All projects</option>{data.projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <button type="submit">Filter</button>
  </form></section>
  <div className={styles.grid4}>
   <div className={styles.stat}><small>Records shown</small><strong>{rows.length}</strong><span>Including unconfirmed entries</span></div>
   <div className={styles.stat}><small>Money received</small><strong>{fmtKES(rows.filter(r=>r.kind==="income"&&r.verified).reduce((s,r)=>s+r.amount,0))}</strong><span>Posted, in KES</span></div>
   <div className={styles.stat}><small>Money spent</small><strong>{fmtKES(rows.filter(r=>r.kind==="expense"&&r.verified).reduce((s,r)=>s+r.amount,0))}</strong><span>Paid, in KES</span></div>
   <div className={styles.stat}><small>Not confirmed</small><strong>{rows.filter(r=>!r.verified).length}</strong><span>Excluded from totals</span></div>
  </div>
  <section className={styles.panel}><div className={styles.panelTop}><h2>Transactions</h2><p>{rows.length} result(s)</p></div>
   {!rows.length?<div className={styles.empty}>No matching transactions. Try a wider date range.</div>:
   <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Project</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>{rows.slice(0,250).map(row=><tr key={row.source+"-"+row.id}>
      <td>{formatDate(row.date)}</td><td>{data.projects.find((p:any)=>p.id===row.project_id)?.name||"Unknown project"}</td><td><strong>{row.description}</strong><small>{row.source==="membership"?"Member contribution":row.source==="expense"?"Project expense":"Service income"}</small></td>
      <td>{row.kind==="income"?"Money in":"Money out"}</td>
      <td className={row.kind==="income"?styles.moneyIn:styles.moneyOut}>{row.kind==="income"?"+":"−"}{row.currency} {row.amount.toLocaleString("en-KE")}</td>
      <td><span className={row.verified?styles.status+" "+styles.statusGood:styles.status}>{row.status}</span></td>
    </tr>)}</tbody></table></div>}
   {rows.length>250&&<p>Showing the latest 250 matching rows. Download a report for all recorded transactions.</p>}
  </section>
 </main>;
}
