import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {readAllRows} from "../../../../lib/recordReads";
import {loadFinanceOfficeData,fmtKES,formatDate} from "../../../../lib/financeOfficeData";
import {financeWritesEnabled} from "../../../../lib/financeBackoffice";
import {recordProjectBill,confirmProjectBillPaid} from "../actions";
import styles from "../../financeUi.module.css";
export default async function FinanceBills({searchParams}:{
 searchParams:Promise<{created?:string;confirmed?:string}>}){
 const snapshot=await loadFinanceOfficeData();
 const {created,confirmed}=await searchParams;
 const db=createAdminClient();
 const result=await readAllRows(()=>db.from("project_expenses")
  .select("id,project_id,amount,currency,expense_date,category,vendor,notes,payment_status,created_at")
  .order("expense_date",{ascending:false}).order("id"));
 if(result.error)throw new Error("Bills could not be loaded. No expense records were changed.");
 const bills=result.data||[];
 const outstanding=bills.filter((r:any)=>r.payment_status==="committed");
 const paid=bills.filter((r:any)=>r.payment_status==="paid");
 const write=financeWritesEnabled();
 return <main className={styles.root}>
  <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / EXPENSES</span>
   <h1>Bills & expenses</h1><p>Keep upcoming bills separate from money already paid. Record a bill first, then confirm it after checking payment evidence.</p></div>
   <Link className={styles.buttonSecondary} href="/finance-office/transactions">All transactions</Link>
  </header>
  <div className={styles.grid4}>
   <div className={styles.stat}><small>Bills awaiting payment</small><strong>{outstanding.length}</strong><span>Commitments, not money spent</span></div>
   <div className={styles.stat}><small>Total outstanding</small><strong>{fmtKES(outstanding.filter((b:any)=>b.currency==="KES").reduce((s:number,b:any)=>s+Number(b.amount),0))}</strong><span>Not deducted from recorded cashflow</span></div>
   <div className={styles.stat}><small>Paid expense records</small><strong>{paid.length}</strong><span>Marked paid in project ledgers</span></div>
   <div className={styles.stat}><small>Total recorded paid</small><strong>{fmtKES(paid.filter((b:any)=>b.currency==="KES").reduce((s:number,b:any)=>s+Number(b.amount),0))}</strong><span>Not bank reconciliation</span></div>
  </div>
  {(created==="1"||confirmed==="1")&&<div className={styles.note} role="status">{created==="1"?"Bill saved as awaiting payment.":"Bill marked paid with a manual reference."}</div>}
  <div className={styles.grid2}>
   <section className={styles.panel}><h2>Record a new bill</h2><p>Only use this after there is a real supplier cost or an agreed project expense.</p>
    {!write&&<div className={styles.note}>Financial write actions are disabled in the preview.</div>}
    <form action={recordProjectBill} className={styles.searchForm}>
     <label>Project<select name="project_id" required disabled={!write}><option value="">Choose project</option>{snapshot.projects.filter((p:any)=>p.status==="active").map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label>Amount KES<input name="amount_kes" type="number" min="0.01" step="0.01" max="10000000" required disabled={!write}/></label>
     <label>Category<input name="category" required maxLength={90} disabled={!write} placeholder="Hosting, transport, studio..."/></label>
     <label>Bill date<input type="date" name="expense_date" required disabled={!write}/></label>
     <label>Supplier (optional)<input name="vendor" maxLength={120} disabled={!write}/></label>
     <label>What was it for?<input name="description" required maxLength={450} disabled={!write} placeholder="Explain the expense clearly"/></label>
     <button type="submit" disabled={!write}>Save bill (not yet paid)</button>
    </form>
   </section>
   <section className={styles.panel}><h2>What happens next?</h2>
    <div className={styles.items}><div className={styles.item}><strong>1. Enter the bill</strong><small>Choose project, amount and purpose</small></div>
     <div className={styles.item}><strong>2. Check supporting evidence</strong><small>Compare supplier invoice or payment proof</small></div>
     <div className={styles.item}><strong>3. Confirm when paid</strong><small>Mark as paid only with a valid reference</small></div>
     <div className={styles.item}><strong>4. See updated reports</strong><small>Paid expenses appear in project totals, not before</small></div>
    </div>
    <Link className={styles.buttonSecondary} href="/finance-office/reports">Open finance reports</Link>
   </section>
  </div>
  <section className={styles.panel}><div className={styles.panelTop}><h2>Bills awaiting payment</h2><strong>{outstanding.length}</strong></div>
   {!outstanding.length?<div className={styles.empty}>No bills are currently awaiting payment.</div>:
   <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Bill</th><th>Project</th><th>Amount</th><th>Date</th><th>Confirm paid</th></tr></thead>
    <tbody>{outstanding.map((bill:any)=><tr key={bill.id}>
     <td><strong>{bill.category}</strong><small>{bill.vendor||bill.notes||"Project cost"}</small></td>
     <td>{snapshot.projects.find((p:any)=>p.id===bill.project_id)?.name||"Project"}</td>
     <td>{bill.currency} {Number(bill.amount||0).toLocaleString("en-KE")}</td>
     <td>{formatDate(bill.expense_date)}</td>
     <td>{write?<form action={confirmProjectBillPaid} className={styles.searchForm}>
       <input type="hidden" name="expense_id" value={bill.id}/>
       <label>Payment reference<input name="receipt_reference" required placeholder="Actual receipt reference"/></label>
       <label><span><input type="checkbox" name="payment_confirmed" value="yes" required/> Verified payment evidence</span></label>
       <button type="submit">Mark manually paid</button>
      </form>:<span className={styles.status}>Review only</span>}</td>
    </tr>)}</tbody></table></div>}
  </section>
  <section className={styles.panel}><h2>Paid expense history</h2>
    {!paid.length?<div className={styles.empty}>No paid project expenses recorded yet.</div>:
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Project</th><th>Expense</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>{paid.slice(0,100).map((bill:any)=><tr key={bill.id}>
     <td>{formatDate(bill.expense_date)}</td><td>{snapshot.projects.find((p:any)=>p.id===bill.project_id)?.name||"Project"}</td>
     <td><strong>{bill.category}</strong><small>{bill.vendor||bill.notes||"Expense"}</small></td>
     <td className={styles.moneyOut}>− {bill.currency} {Number(bill.amount||0).toLocaleString("en-KE")}</td>
     <td><span className={styles.status+" "+styles.statusGood}>Paid (recorded)</span></td>
    </tr>)}</tbody></table></div>}
  </section>
 </main>;
}
