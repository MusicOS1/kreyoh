import Link from "next/link";
import {notFound} from "next/navigation";
import {createAdminClient} from "../../../../../../lib/supabase/admin";
import {requireControlRoomPermission} from "../../../../../../lib/controlRoom";
import {readAllRows} from "../../../../../../lib/recordReads";
import {TUKO_PROJECT_ID,summariseProjects,financeWritesEnabled} from "../../../../../../lib/financeBackoffice";
import {isPurposeAllowedForPaymentMode} from "../../../../../../lib/paystackPaymentPolicy";
import PaymentLinkCopy from "../../../../../payments/PaymentLinkCopy";
import {createCentralServiceInvoice} from "../../actions";
import styles from "../../finance.module.css";

const validUuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fmt=(n:number)=>"KES "+n.toLocaleString("en-KE",{maximumFractionDigits:2});
export default async function ProjectFinanceDetail({params,searchParams}:{
 params:Promise<{projectId:string}>;searchParams:Promise<{created?:string}>
}){
 await requireControlRoomPermission("finance");
 const {projectId}=await params;
 if(!validUuid.test(projectId))notFound();
 const admin=createAdminClient();
 const {data:project,error:projectError}=await admin.from("projects")
  .select("id,name,code,owner_id,status").eq("id",projectId).maybeSingle();
 if(projectError)throw new Error("Project finance account could not be opened.");
 if(!project)notFound();
 const [revenueR,membershipR,expenseR,invoicesR,ownerR]=await Promise.all([
  readAllRows(()=>admin.from("revenue_records").select("id,project_id,revenue_source,amount,currency,payment_status,received_date,expected_date,created_at").eq("project_id",projectId).order("id")),
  readAllRows(()=>admin.from("project_membership_transactions").select("id,project_id,transaction_code,amount,currency,status,transaction_date").eq("project_id",projectId).order("id")),
  readAllRows(()=>admin.from("project_expenses").select("id,project_id,category,amount,currency,payment_status,expense_date").eq("project_id",projectId).order("id")),
  readAllRows(()=>admin.from("project_payment_invoices").select("id,public_token,project_id,description,purpose,amount_kes,status,payer_email,created_at,created_by").eq("project_id",projectId).order("created_at",{ascending:false}).order("id")),
  project.owner_id?admin.from("profiles").select("full_name,stage_name,email").eq("id",project.owner_id).maybeSingle():Promise.resolve({data:null,error:null})
 ]);
 const fail=Boolean(revenueR.error||membershipR.error||expenseR.error||invoicesR.error||ownerR.error);
 const sums=fail?null:summariseProjects([project],revenueR.data||[],membershipR.data||[],expenseR.data||[]).get(projectId);
 const owner=projectId===TUKO_PROJECT_ID?"Third Culture":ownerR.data?.stage_name||ownerR.data?.full_name||ownerR.data?.email||"Owner not assigned";
 const invoices=invoicesR.data||[];
 const {created}=await searchParams;
 const newInvoice=invoices.find((x:any)=>x.public_token===created&&x.status==="open");
 const canWrite=financeWritesEnabled();
 const mode=process.env.PAYSTACK_MODE==="live"?"live":"test";
 const rows=[
  ...(revenueR.data||[]).map((r:any)=>({id:r.id,date:r.received_date||r.expected_date||r.created_at,kind:"Commercial income",title:r.revenue_source||"Income",amount:Number(r.amount||0),currency:r.currency,status:r.payment_status})),
  ...(membershipR.data||[]).map((r:any)=>({id:r.id,date:r.transaction_date,kind:"Member contribution",title:r.transaction_code||"Membership",amount:Number(r.amount||0),currency:r.currency,status:r.status})),
  ...(expenseR.data||[]).map((r:any)=>({id:r.id,date:r.expense_date,kind:"Expense",title:r.category||"Expense",amount:Number(r.amount||0),currency:r.currency,status:r.payment_status}))
 ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,45);
 return <main className={styles.root}>
  <header className={styles.head}><span className={styles.kicker}>FINANCE BACK OFFICE / PROJECT ACCOUNT</span><h1>{project.name}</h1>
   <p>Independent project ledger. Finance contact: <strong>{owner}</strong>. {projectId===TUKO_PROJECT_ID?"The Third Culture operating book stays separate from the TUKO project ledger.":""}</p>
   <div className={styles.actions}><Link className={styles.secondary} href="/admin/finance">All finance accounts</Link></div>
  </header>
  {fail?<div className={styles.callout} role="alert">The financial records for this project could not be verified. Totals are withheld.</div>:<>
   <div className={styles.grid}>
    <article className={styles.card}><span className={styles.kicker}>RECORDED MONEY RECEIVED</span><h3>{fmt(sums?.received||0)}</h3><p>Posted member contributions plus paid non-membership revenue.</p></article>
    <article className={styles.card}><span className={styles.kicker}>RECORDED MONEY PAID OUT</span><h3>{fmt(sums?.spent||0)}</h3><p>Paid project expenses only. Expected bills remain outside this amount.</p></article>
   </div>
   <div className={styles.callout}>These figures are recorded income and expenses in KES, not a bank balance, platform profit or the artist's payout. Paystack-verified invoices are included through their revenue postings, not added a second time.</div>
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Create a payment link</h2><p>One-time services only. Only a finance leader with platform Finance permission can issue links across projects.</p></div></div>
    {!canWrite&&<div className={styles.callout}>Preview only: payment-link creation is disabled. Existing checkout and financial records are not modified.</div>}
    {newInvoice&&<div className={styles.callout}><strong>New payment request created.</strong> Share the fixed-amount link securely. <PaymentLinkCopy token={newInvoice.public_token}/></div>}
    <form action={createCentralServiceInvoice} className={styles.form}>
     <input type="hidden" name="project_id" value={projectId}/>
     <label>Service<select name="purpose" required disabled={!canWrite}>
      {["recording_session","production_service"].filter(x=>isPurposeAllowedForPaymentMode(x,mode)).map(x=><option key={x} value={x}>{x==="recording_session"?"Recording session":"Production service"}</option>)}
     </select></label>
     <label>Amount KES<input name="amount_kes" type="number" min={3} max={150000} step={1} required disabled={!canWrite}/></label>
     <label className={styles.wide}>Description<input name="description" required minLength={3} maxLength={240} disabled={!canWrite} placeholder="Example: 2-hour recording session"/></label>
     <label className={styles.wide}>Payer email (optional)<input name="payer_email" type="email" disabled={!canWrite}/></label>
     <button disabled={!canWrite||project.status!=="active"}>Create one-time payment link</button>
    </form>
   </section>
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Payment requests</h2><p>Open invoices can be shared. Paid invoices are recorded already and cannot be charged again.</p></div></div>
    {!invoices.length?<div className={styles.empty}>No project invoices have been issued.</div>:
     <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Payment</th><th>Amount</th><th>Status</th><th>Link</th></tr></thead><tbody>{invoices.slice(0,40).map((r:any)=><tr key={r.id}>
      <td><strong>{r.description}</strong><small>{r.purpose.replaceAll("_"," ")} · {new Date(r.created_at).toLocaleDateString("en-KE")}</small></td><td>{fmt(Number(r.amount_kes))}</td><td>{r.status}</td>
      <td>{r.status==="open"?<PaymentLinkCopy token={r.public_token}/>:<small>Checkout closed</small>}</td>
     </tr>)}</tbody></table></div>}
   </section>
   <section className={styles.section}><div className={styles.sectionHead}><div><h2>Recent project activity</h2><p>From this project's existing membership, commercial and expense records.</p></div></div>
    {!rows.length?<div className={styles.empty}>No financial transactions recorded for this project.</div>:
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
     <tbody>{rows.map((r:any)=><tr key={r.kind+"-"+r.id}><td>{String(r.date||"").slice(0,10)}</td><td>{r.kind}</td><td>{r.title}</td><td>{r.currency} {r.amount.toLocaleString("en-KE")}</td><td>{r.status}</td></tr>)}</tbody></table></div>}
   </section>
  </>}
 </main>;
}
