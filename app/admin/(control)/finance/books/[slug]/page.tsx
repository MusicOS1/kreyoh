import Link from "next/link";
import {notFound} from "next/navigation";
import {createAdminClient} from "../../../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../../../lib/controlRoom";
import {readAllRows} from "../../../../../../lib/recordReads";
import {FINANCE_BOOKS,financeWritesEnabled,recordedBookTotals} from "../../../../../../lib/financeBackoffice";
import {recordFinanceBookEntry,postFinanceBookEntry} from "../../actions";
import styles from "../../finance.module.css";

const fmt=(n:number)=>"KES "+n.toLocaleString("en-KE",{maximumFractionDigits:2});
export default async function OperatingBook({params,searchParams}:{
 params:Promise<{slug:string}>;searchParams:Promise<{created?:string}>
}){
 await requireControlRoomPermission("finance");
 const {slug}=await params;
 const def=FINANCE_BOOKS.find(b=>b.slug===slug);if(!def)notFound();
 const admin=createAdminClient();
 const {data:book,error:bookError}=await admin.from("finance_books")
  .select("id,name,book_kind,description").eq("slug",slug).maybeSingle();
 const available=!bookError&&Boolean(book);
 const entryR=available?await readAllRows(()=>admin.from("finance_book_entries")
  .select("id,book_id,entry_type,amount_kes,category,description,reference,entry_date,status,created_at")
  .eq("book_id",book!.id).order("entry_date",{ascending:false}).order("id",{ascending:false})):{data:[],error:bookError,count:0};
 const entries=entryR.data||[];
 const totals=recordedBookTotals(entries).get(book?.id||"")||{income:0,expense:0};
 const writable=financeWritesEnabled()&&available&&!entryR.error;
 const {created}=await searchParams;
 return <main className={styles.root}>
  <header className={styles.head}><span className={styles.kicker}>FINANCE BACK OFFICE / OPERATING ACCOUNT</span>
   <h1>{def.name}</h1><p>{def.caption}. This is a separate manual operating ledger and is not a wallet, bank account or artist payout account.</p>
   <div className={styles.actions}><Link className={styles.secondary} href="/finance-office">All finance accounts</Link></div>
  </header>
  {!available?<div className={styles.callout} role="status">This operating ledger has not yet been created in the database. Finance will be able to record income and costs here only after the reviewed finance migration is approved. This does not mean the organisation has no money or that any Paystack payments failed.</div>:
   entryR.error?<div className={styles.callout} role="alert">Operating entries could not be loaded. Totals are withheld. Try again.</div>:<>
   <div className={styles.grid}>
    <article className={styles.card}><span className={styles.kicker}>CONFIRMED RECORDS</span><h3>{fmt(totals.income)}</h3><p>Money in marked as recorded in this book (not bank-verified deposits).</p></article>
    <article className={styles.card}><span className={styles.kicker}>CONFIRMED RECORDS</span><h3>{fmt(totals.expense)}</h3><p>Money out marked as recorded in this book (not automatic payouts).</p></article>
   </div>
   {created==="1"&&<p role="status">Draft saved. Confirm the details below before marking it as recorded.</p>}
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Record money in or out</h2><p>Three simple steps: choose direction, describe the item, then save a draft for checking.</p></div></div>
    {!writable&&<div className={styles.callout}>Preview mode: entering or posting financial records is disabled. A finance lead can use this form only after the approved schema is installed and production writes are explicitly enabled.</div>}
    <form action={recordFinanceBookEntry} className={styles.form}>
     <input type="hidden" name="book_slug" value={slug}/>
     <label>1. What happened?<select name="entry_type" disabled={!writable}><option value="expense">Money went out</option><option value="income">Money came in</option></select></label>
     <label>2. Amount in KES<input name="amount_kes" type="number" min="0.01" max="10000000" step="0.01" required disabled={!writable} placeholder="1500"/></label>
     <label>Category<input name="category" required minLength={2} maxLength={90} disabled={!writable} placeholder="Hosting, subscriptions, event hire…"/></label>
     <label>Date<input name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required disabled={!writable}/></label>
     <label className={styles.wide}>3. What was it for?<textarea name="description" required minLength={3} maxLength={500} disabled={!writable} placeholder="Example: Monthly platform hosting"/></label>
     <label className={styles.wide}>Receipt, bank or M-PESA reference (optional)<input name="reference" maxLength={150} disabled={!writable}/></label>
     <button type="submit" disabled={!writable}>Save draft for review</button>
    </form>
   </section>
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Account activity</h2><p>Drafts do not affect the recorded totals. A finance lead confirms them before posting.</p></div><strong>{entries.length} entries</strong></div>
    {!entries.length?<div className={styles.empty}>No records yet. The account starts without an assumed opening balance.</div>:
     <div className={styles.tableWrap}><table className={styles.table}>
     <thead><tr><th>Date</th><th>What happened</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
     <tbody>{entries.map((r:any)=><tr key={r.id}>
       <td>{r.entry_date}</td><td><strong>{r.description}</strong><small>{r.category}{r.reference?" · Ref: "+r.reference:""}</small></td>
       <td>{r.entry_type==="expense"?"−":"+"}{fmt(Number(r.amount_kes))}</td>
       <td>{r.status==="posted"?"Recorded":"Draft — review needed"}</td>
       <td>{r.status==="draft"&&writable?<form action={postFinanceBookEntry}><input type="hidden" name="book_slug" value={slug}/><input type="hidden" name="entry_id" value={r.id}/><button type="submit">Confirm record</button></form>:<small>No action</small>}</td>
     </tr>)}</tbody></table></div>}
   </section>
  </>}
 </main>;
}
