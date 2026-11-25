import Link from "next/link";
import {createAdminClient} from "../../../../lib/supabase/admin";
import {readAllRows} from "../../../../lib/recordReads";
import {requireControlRoomPermission} from "../../../../lib/controlRoom";
import {financeWritesEnabled} from "../../../../lib/financeBackoffice";
import {FINANCE_REQUEST_TYPES} from "../../../../lib/financePaymentRequests";
import {loadFinanceOfficeData,fmtKES,formatDate} from "../../../../lib/financeOfficeData";
import {cancelFinancePaymentRequest} from "./actions";
import FinancePaymentRequestForm from "../../../../components/FinancePaymentRequestForm";
import styles from "../../financeUi.module.css";
export const metadata={title:"Create Payment Requests | FACKTS Music Finance"};
export default async function PaymentRequests({searchParams}:{
 searchParams:Promise<{created?:string}>}){
 await requireControlRoomPermission("finance");
 const data=await loadFinanceOfficeData();
 const db=createAdminClient();
 const {created}=await searchParams;
 const list=await readAllRows(()=>db.from("finance_payment_requests")
   .select("id,public_token,purpose_code,receiver_scope,project_id,description,amount_kes,recurrence,status,checkout_state,created_at")
   .order("created_at",{ascending:false}).order("id",{ascending:false}));
 const ready=!list.error;
 const enabled=financeWritesEnabled()&&ready;
 const rows=list.data||[];
 const accountName=(r:any)=>r.receiver_scope==="fackts_music"?"FACKTS Music platform":
   data.projects.find((p:any)=>p.id===r.project_id)?.name||"Unidentified project";
 return <main className={styles.root}>
   <header className={styles.head}><div><span className={styles.eyebrow}>FINANCE OFFICE / PAYMENTS</span>
    <h1>Create a payment request</h1>
    <p>One simple form for platform charges, artist fees, services, fan support, sponsorship and future approved charges. Every request has a purpose and a receiving account.</p></div>
    <Link className={styles.buttonSecondary} href="/finance-office/payments">Existing service payments</Link></header>
   <div className={styles.note} role="status">
    <strong>{ready?"Draft-only payment requests":"Request register setup pending."}</strong>
    {ready?" Each new request is a draft, not a payable checkout. Activation requires separate commercial rules, Paystack verification and an approved plan for subscriptions.":
      " The separate request register has not been installed in the database; no links or charges will be generated during preview."}
   </div>
   {created==="1"&&<div className={styles.note} role="status">A draft payment request was saved. It is not yet chargeable or shareable as a live payment link.</div>}
   <section className={styles.panel}>
    <div className={styles.panelTop}><div><h2>New request</h2><p>Select a category, recipient and amount. The description tells the payer exactly what the request covers.</p></div>
    <span className={styles.status}>No checkout enabled</span></div>
    <FinancePaymentRequestForm enabled={enabled} projects={data.projects.filter((p:any)=>p.status==="active").map((p:any)=>({id:p.id,name:p.name}))}/>
    <p>Recurring requests do not create automatic deductions. Fan and artist support cannot be activated before the correct beneficiary, revenue splits and refund terms are approved.</p>
   </section>
   <section className={styles.panel}><div className={styles.panelTop}><h2>Payment-request register</h2><span>{ready?rows.length:"Not installed"}</span></div>
    {!ready?<div className={styles.empty}>The request table is awaiting migration approval. Existing studio/production invoices are still available on the Service Payments page.</div>:
    rows.length===0?<div className={styles.empty}>No general payment requests saved yet.</div>:
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Request</th><th>Receiving account</th><th>Amount</th><th>Frequency</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>{rows.slice(0,80).map((r:any)=><tr key={r.id}>
     <td><strong>{r.description}</strong><small>{FINANCE_REQUEST_TYPES.find(t=>t.code===r.purpose_code)?.name||"Other"} · {formatDate(r.created_at)}</small></td>
     <td>{accountName(r)}</td><td>{fmtKES(Number(r.amount_kes))}</td>
     <td>{r.recurrence.replaceAll("_"," ")}</td>
     <td><span className={styles.status}>{r.status} · checkout not enabled</span></td>
     <td>{enabled&&r.status!=="cancelled"?<form action={cancelFinancePaymentRequest}>
       <input type="hidden" name="request_id" value={r.id}/><button className={styles.buttonSecondary}>Cancel</button></form>:<span>No live link</span>}</td>
    </tr>)}</tbody>
    </table></div>}
   </section>
   <section className={styles.panel}><h2>Other future income and financial responsibilities</h2>
    <p>Streaming royalties, distribution income, licensing deals, sponsorship opportunities, investor contributions, shareholding and artist payouts will need dedicated contracts, allocations and reconciliations. They are <strong>not automatically payable links</strong> and do not count as cash received until verified.</p>
    <div className={styles.quick}>
     <Link href="/finance-office/platform">FACKTS business accounting</Link>
     <Link href="/finance-office/fan-payments">Fan support payment points</Link>
     <Link href="/finance-office/reports">Project accounts and reports</Link>
     <Link href="/finance-office/payments">Existing service invoices</Link>
    </div>
   </section>
 </main>;
}
