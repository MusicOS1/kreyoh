import Link from "next/link";
import AppShell from "../../components/AppShell";
import {getWorkspace} from "../../lib/workspace";
import {canEditProjectFinance,canViewProjectFinanceReport} from "../../lib/financeAccess";
import {isPurposeAllowedForPaymentMode} from "../../lib/paystackPaymentPolicy";
import {createPaymentInvoice} from "./actions";
import PaymentLinkCopy from "./PaymentLinkCopy";
import styles from "./payments.module.css";

const choices=[
 ["recording_session","Recording session"],
 ["project_contribution","Project contribution"],
 ["camera_hire","Camera hire"],
 ["set_design","Studio set design"],
 ["production_service","Production service"]
];

export default async function ProjectPayments({searchParams}:{searchParams:Promise<{created?:string}>}){
  const {admin,project,roles,membership,user}=await getWorkspace();
  if(!project||!membership)
    return <AppShell><main className={styles.panel}><h1>Payments</h1><p>Choose a project to see its payment requests.</p><Link href="/projects">My projects</Link></main></AppShell>;
  if(!canEditProjectFinance(roles)){
    const email=user.email_confirmed_at && user.email?.trim().toLowerCase();
    const result=email ? await admin.from("project_payment_invoices")
      .select("id,public_token,description,amount_kes")
      .eq("project_id",project.id).eq("payer_email",email).eq("status","open")
      .order("created_at",{ascending:false}) : null;
    return <AppShell><main className={styles.root}>
      <header><p className={styles.eyebrow}>{project.name}</p><h1>My payments</h1></header>
      <section className={styles.panel}><h2>Invoices to pay</h2>
        {!email ? <p>Verify your account email to see your invoices, or open the checkout link your project administrator shared.</p> :
          result?.error ? <p role="alert">Your invoices could not be loaded. Please try again.</p> :
          result?.data?.length ? result.data.map(invoice=><div className={styles.invoiceRow} key={invoice.id}>
            <div><strong>{invoice.description}</strong><span>KES {Number(invoice.amount_kes).toLocaleString("en-KE")}</span></div>
            <Link className={styles.payLink} href={'/payments/pay/'+invoice.public_token} aria-label={'Pay invoice for '+invoice.description}>Pay invoice</Link>
          </div>) : <p>No open invoices for {email} in this project. If you expected one, ask your project administrator for the payment link.</p>}
      </section>
      {canViewProjectFinanceReport(roles)&&<Link href="/finance">Open project finance</Link>}
    </main></AppShell>;
  }
  const [invoiceResult,sessionResult]=await Promise.all([
    admin.from("project_payment_invoices").select("id,public_token,purpose,description,amount_kes,status,payer_email,created_at")
      .eq("project_id",project.id).order("created_at",{ascending:false}).limit(40),
    admin.from("studio_sessions").select("id,starts_at,location,status").eq("project_id",project.id)
      .order("starts_at",{ascending:false}).limit(100)
  ]);
  const invoices=invoiceResult.data||[];
  const sessions=sessionResult.data||[];
  const {created}=await searchParams;
  const enabled=process.env.PAYSTACK_PAYMENTS_ENABLED==="true";
  const mode=process.env.PAYSTACK_MODE==="live"?"live":"test";
  return <AppShell><main className={styles.root}>
    <div className={styles.eyebrow}>FACKTS MUSIC / {project.code} / FINANCE</div>
    <header className={styles.header}><div><h1>Project payments</h1><p>Issue invoices and collect through Paystack M-PESA. Verified receipts post to the existing finance tracker.</p></div>
      <div className={styles.tag}>{enabled?(mode==="test"?"SANDBOX — NO REAL MONEY":"LIVE COLLECTIONS"):"CHECKOUT DISABLED"}</div>
    </header>
    {created&&<section className={styles.success}><strong>Payment request created.</strong><p>Share the link below with the payer.</p><PaymentLinkCopy token={created}/></section>}
    {invoiceResult.error&&<p role="alert">Unable to load invoices. The database migration may still be pending.</p>}
    <section className={styles.panel}><h2>Create a payment request</h2>
      <p>Only administrators create invoices. Payers cannot alter the amount, project or purpose.</p>
      <form action={createPaymentInvoice} className={styles.form}>
        <label>Payment type<select name="purpose" required>{choices.filter(([id])=>isPurposeAllowedForPaymentMode(id,mode)).map(([id,title])=><option value={id} key={id}>{title}</option>)}</select></label>
        <label>Description<input name="description" required minLength={3} maxLength={240} placeholder="Studio recording · 2 hours"/></label>
        <label>Amount in KES<input name="amount_kes" required type="number" min={3} max={150000} step={1} placeholder="1500"/></label>
        <label>Payer email (optional)<input name="payer_email" type="email" placeholder="Leave blank for a shareable payment link"/></label>
        <label>Recording session (optional)<select name="session_id"><option value="">No session linked</option>{sessions.map((s:any)=><option key={s.id} value={s.id}>{new Date(s.starts_at).toLocaleString("en-KE")} · {s.location||"Studio"}</option>)}</select></label>
        <button className={styles.primary} type="submit">Create payment link</button>
      </form>
    </section>
    <section className={styles.panel}><h2>Project payment requests</h2>
      <div className={styles.invoiceList}>{invoices.length?invoices.map((row:any)=><div key={row.id} className={styles.invoiceRow}>
        <div><strong>{row.description}</strong><small>{row.purpose.replaceAll("_"," ")} · {row.status} · {new Date(row.created_at).toLocaleDateString("en-KE")}</small></div>
        <div><strong>KES {Number(row.amount_kes).toLocaleString("en-KE")}</strong><PaymentLinkCopy token={row.public_token}/></div>
      </div>):<p>No invoices yet. Create your first above.</p>}</div>
    </section>
    <p className={styles.note}>No automatic payouts or artist wallets. Money settles to the merchant account registered with Paystack. <Link href="/finance">Open project finance →</Link></p>
  </main></AppShell>;
}
