import Link from "next/link";
import PaymentLinkCopy from "../../../payments/PaymentLinkCopy";
import {loadFinanceOfficeData,fmtKES,formatDate} from "../../../../lib/financeOfficeData";
import styles from "../../financeUi.module.css";
export default async function CentralPayments({searchParams}:{
 searchParams:Promise<{status?:string}>}){
 const data=await loadFinanceOfficeData();
 const {status="all"}=await searchParams;
 const selected=["all","open","paid","cancelled","failed"].includes(status)?status:"all";
 const invoices=data.invoices.filter((i:any)=>selected==="all"||i.status===selected);
 const open=data.invoices.filter((i:any)=>i.status==="open").length;
 const paid=data.invoices.filter((i:any)=>i.status==="paid");
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE / PAYMENTS</span><h1>Payment requests & links</h1>
   <p>View existing approved service checkouts. Platform fees, artist service requests, fan support and recurring plans are managed separately as Finance payment requests.</p></div><div className={styles.pills}><Link className={styles.buttonSecondary} href="/finance-office/accounts">Choose a project</Link><Link className={styles.button} href="/finance-office/payment-requests">Create a payment request</Link><Link className={styles.buttonSecondary} href="/finance-office/fan-payments">Fan payment points</Link></div></header>
  <div className={styles.grid4}>
   <div className={styles.stat}><small>Paid invoices</small><strong>{paid.length}</strong><span>Marked paid after provider verification</span></div>
   <div className={styles.stat}><small>Recorded invoice face value</small><strong>{fmtKES(paid.reduce((sum:number,i:any)=>sum+Number(i.amount_kes||0),0))}</strong><span>Do not add again to project revenue</span></div>
   <div className={styles.stat}><small>Open requests</small><strong>{open}</strong><span>Not recorded as money received</span></div>
   <div className={styles.stat}><small>Projects</small><strong>{new Set(data.invoices.map((i:any)=>i.project_id)).size}</strong><span>With payment requests</span></div>
  </div>
  <div className={styles.note}>Payment links belong to a specific project and approved service. Paid requests are closed. For fan support or subscriptions, open <Link href="/finance-office/fan-payments">Fan payment points</Link>. These service invoices are not artist donations or payouts. New links are disabled in preview.</div>
  <section className={styles.panel}><div className={styles.panelTop}><h2>Project payment requests</h2><span>{invoices.length} results</span></div>
   <nav className={styles.pills} aria-label="Filter payment requests">
    {["all","open","paid","cancelled"].map(s=><Link key={s} className={styles.pill+" "+(selected===s?styles.pillActive:"")} href={"/finance-office/payments?status="+s}>{s==="all"?"All":s[0].toUpperCase()+s.slice(1)}</Link>)}
   </nav>
   {!invoices.length?<div className={styles.empty}>No requests with that status. A project Finance account has a payment-link form for approved services.</div>:
    <div className={styles.tableWrap}><table className={styles.table}>
    <thead><tr><th>Service</th><th>Project</th><th>Amount</th><th>Status</th><th>Date</th><th>Link / action</th></tr></thead>
    <tbody>{invoices.map((i:any)=><tr key={i.id}>
     <td><strong>{i.description}</strong><small>{String(i.purpose||"Service").replaceAll("_"," ")}</small></td>
     <td>{data.projects.find((p:any)=>p.id===i.project_id)?.name||"Project unavailable"}</td>
     <td>{fmtKES(Number(i.amount_kes||0))}</td>
     <td><span className={i.status==="paid"?styles.status+" "+styles.statusGood:styles.status}>{i.status}</span></td>
     <td>{formatDate(i.created_at)}</td>
     <td>{i.status==="open"?<PaymentLinkCopy token={i.public_token}/>:<Link href={"/finance-office/projects/"+i.project_id}>View project</Link>}</td>
    </tr>)}</tbody>
   </table></div>}
  </section>
 </main>;
}
