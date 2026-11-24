import Link from "next/link";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {loadFinanceOfficeData,fmtKES,formatDate} from "../../../../lib/financeOfficeData";
import {financeWritesEnabled} from "../../../../lib/financeBackoffice";
import {recordFinanceBookEntry,postFinanceBookEntry} from "../../../admin/(control)/finance/actions";
import styles from "../../financeUi.module.css";

export const metadata={title:"FACKTS Music Business Finance | FACKTS Music"};
export default async function FacktsPlatformFinance({searchParams}:{
 searchParams:Promise<{created?:string}>}){
 await requireControlRoomPermission("finance");
 const data=await loadFinanceOfficeData();
 const params=await searchParams;
 const book=data.books.find((b:any)=>b.slug==="fackts_music_platform");
 const ready=Boolean(book&&data.bookDataAvailable);
 const entries=ready?data.bookEntries.filter((e:any)=>e.book_id===book!.id):[];
 const posted=entries.filter((entry:any)=>entry.status==="posted");
 const drafts=entries.filter((entry:any)=>entry.status==="draft");
 const moneyIn=posted.filter((e:any)=>e.entry_type==="income").reduce((s:number,e:any)=>s+Number(e.amount_kes||0),0);
 const moneyOut=posted.filter((e:any)=>e.entry_type==="expense").reduce((s:number,e:any)=>s+Number(e.amount_kes||0),0);
 const canWrite=ready&&financeWritesEnabled();
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FACKTS MUSIC / PERMANENT BUSINESS ACCOUNT</span>
   <h1>FACKTS Music finances</h1>
   <p>Money coming into the FACKTS Music business, money going out, expenses, services and operating costs. Independent of Third Culture and every artist-owned project.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office">Finance overview</Link>
  </header>
  <div className={styles.grid4}>
   <article className={styles.stat}><small>FACKTS money in</small><strong>{ready?fmtKES(moneyIn):"Not recorded"}</strong><span>Posted entries in the FACKTS Music business ledger only</span></article>
   <article className={styles.stat}><small>FACKTS money out</small><strong>{ready?fmtKES(moneyOut):"Not recorded"}</strong><span>Posted operating expenses only</span></article>
   <article className={styles.stat}><small>Net recorded movement</small><strong>{ready?fmtKES(moneyIn-moneyOut):"Not recorded"}</strong><span>Not a bank balance or profit statement</span></article>
   <article className={styles.stat}><small>Drafts awaiting checking</small><strong>{ready?drafts.length:"Setup pending"}</strong><span>Not included in recorded cash movement</span></article>
  </div>
  {!ready?<div className={styles.note} role="status"><strong>Business ledger setup pending.</strong> The FACKTS Music operating-book migration has not been approved in the current database. This does not mean FACKTS has no money. The forms below show exactly how Finance will work once the book is installed; they cannot save in this preview.</div>:
   <div className={styles.note}>These are FACKTS Music's own operating-book entries. Third Culture member contributions, its TUKO project money, and independent artists' project receipts are <strong>not included</strong>. Entries are financial records, not bank reconciliation.</div>}
  {params.created==="1"&&<div className={styles.note} role="status">Draft saved. Check it in the activity list before confirming.</div>}
  <section className={styles.panel} id="record">
   <div className={styles.panelTop}><div><h2>Record money in or money out</h2><p>Pick the direction, enter the amount and explain it. Save as a draft before confirmation.</p></div><Link href="/finance-office/reports" className={styles.smallLink}>Project reports are separate</Link></div>
   <div className={styles.grid2}>
    <article className={styles.stat}><small>Money in</small><strong>Business income</strong><span>Recording/production service fees retained by FACKTS, platform subscriptions when approved, sponsorship, distribution income and other verified income</span></article>
    <article className={styles.stat}><small>Money out</small><strong>Business expenses</strong><span>Hosting, software, marketing, team costs, artist support, equipment and approved supplier bills</span></article>
   </div>
   {!canWrite&&<div className={styles.note}>Preview mode: posting income and expenses is disabled. Super Admin must approve the operating ledger and explicitly enable Finance writes in production.</div>}
   <form action={recordFinanceBookEntry} className={styles.financeForm}>
    <input type="hidden" name="book_slug" value="fackts_music_platform"/>
    <label>What happened?<select name="entry_type" disabled={!canWrite} required><option value="income">Money came in</option><option value="expense">Money went out / expense</option></select></label>
    <label>Amount (KES)<input type="number" name="amount_kes" min="0.01" max="10000000" step="0.01" placeholder="e.g. 1500" disabled={!canWrite} required/></label>
    <label>Category<input name="category" placeholder="e.g. Hosting, artist services" maxLength={90} minLength={2} disabled={!canWrite} required/></label>
    <label>Date<input type="date" name="entry_date" disabled={!canWrite} required/></label>
    <label className={styles.formWide}>What was it for?<textarea name="description" placeholder="Explain the income or expense" minLength={3} maxLength={500} disabled={!canWrite} required/></label>
    <label className={styles.formWide}>M-PESA, bank or invoice reference (optional)<input name="reference" maxLength={150} disabled={!canWrite}/></label>
    <button type="submit" disabled={!canWrite}>Save draft for review</button>
   </form>
  </section>
  <div className={styles.grid2}>
   <section className={styles.panel} id="expenses"><div className={styles.panelTop}><h2>Expenses and bills</h2><Link href="#fackts-business-activity" className={styles.smallLink}>View activity</Link></div>
    <p>Operating costs must stay in FACKTS Music's ledger. A draft expense is <strong>not yet money paid</strong>; confirm it only after reviewing the supplier bill or payment evidence.</p>
    <div className={styles.items}>
     <div className={styles.item}><div><strong>Draft expenses to check</strong><small>Not yet counted as paid</small></div><b>{ready?drafts.filter((e:any)=>e.entry_type==="expense").length:"—"}</b></div>
     <div className={styles.item}><div><strong>Recorded operating expenses</strong><small>Confirmed FACKTS Music expenses</small></div><b>{ready?fmtKES(moneyOut):"Not recorded"}</b></div>
    </div>
    <p>Unpaid bills do not yet have a due-date or creditor register in this book. Do not treat a draft as proof of payment.</p>
    <Link href="/finance-office/bills" className={styles.buttonSecondary}>Other project bills (separate)</Link>
   </section>
   <section className={styles.panel}><h2>FACKTS business vs partner money</h2>
    <p>FACKTS Music keeps its own artist operations after the Third Culture engagement finishes. Partner memberships and TUKO project contributions remain entirely outside this business account.</p>
    <div className={styles.quick}>
     <Link href="/finance-office/partners/third-culture">Third Culture partner ledger</Link>
     <Link href="/finance-office/accounts">Independent music projects</Link>
     <Link href="/finance-office/fan-payments">Fan payments (separate)</Link>
     {ready?<Link href="/finance-office/platform/export">Export business records (CSV)</Link>:<span className={styles.status}>Business CSV available after ledger setup</span>}
    </div>
   </section>
  </div>
  <section className={styles.panel} id="fackts-business-activity">
   <div className={styles.panelTop}><div><h2>FACKTS Music business activity</h2><p>Drafts are not included in the recorded totals.</p></div><strong>{ready?entries.length:"Ledger setup pending"}</strong></div>
   {!ready?<div className={styles.empty}>No operating records can be displayed before the FACKTS Music book is created. Existing project income is deliberately not substituted.</div>:
    entries.length===0?<div className={styles.empty}>No business income or expense entries recorded in this account yet.</div>:
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Income / expense</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
     {entries.slice(0,100).map((e:any)=><tr key={e.id}>
      <td>{formatDate(e.entry_date)}</td><td><strong>{e.description}</strong><small>{e.category}{e.reference?" · Ref: "+e.reference:""}</small></td>
      <td className={e.entry_type==="income"?styles.moneyIn:styles.moneyOut}>{e.entry_type==="income"?"+":"−"}{fmtKES(Number(e.amount_kes))}</td>
      <td><span className={styles.status+" "+(e.status==="posted"?styles.statusGood:"")}>{e.status==="posted"?"Recorded":"Draft · verify first"}</span></td>
      <td>{e.status==="draft"&&canWrite?<form action={postFinanceBookEntry}>
        <input type="hidden" name="book_slug" value="fackts_music_platform"/><input type="hidden" name="entry_id" value={e.id}/>
        <button type="submit" className={styles.button}>Confirm record</button></form>:<span>—</span>}</td>
     </tr>)}
    </tbody></table></div>}
  </section>
 </main>;
}
