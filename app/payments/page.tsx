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
    return <AppShell><main className={styles.panel}><h1>Payments</h1><p>Join an authorised project to access its payments.</p><Link href="/projects">My projects</Link></main></AppShell>;
  if(!canEditProjectFinance(roles))
    return <AppShell><main className={styles.root}>
      <div className={styles.eyebrow}>FACKTS MUSIC / {project.code} / PAYMENTS</div>
      <header className={styles.header}><div><h1>Payments & payment links</h1><p>{project.name} · See how payments for project services work.</p></div><span className={styles.tag}>PROJECT MEMBER VIEW</span></header>
      <section className={styles.panel}><h2>Who creates payment links?</h2>
        <p>Only an authorised Project Lead or project finance administrator creates a payment request. The request specifies the service, exact amount in KES and whether a payer email is assigned. You cannot generate an arbitrary live charge from your artist profile.</p>
        <p>Ask your project lead through the existing team chat to create an approved one-time invoice and share the link. There are no recurring artist or fan charges here.</p>
        <div className={styles.shortcuts}><Link href="/messages">Message your project team</Link>{canViewProjectFinanceReport(roles)&&<Link href="/finance">Open project finance</Link>}<Link href="/billboard/submit">Release & fan support</Link></div>
      </section>
      <section className={styles.panel}><h2>What happens after someone pays?</h2>
        <p>Paystack collects the payment. FACKTS confirms the provider result on the server before recording it. Pending, cancelled or unsuccessful attempts must not count as money received. Project collections do not automatically become artist earnings.</p>
        <p>Direct paid fan support, recurring subscriptions and artist payouts are not available here until their commercial settings and provider approvals are confirmed.</p>
      </section>
    </main></AppShell>;
  const [invoiceResult,sessionResult]=await Promise.all([
    admin.from("project_payment_invoices").select("id,public_token,purpose,description,amount_kes,status,payer_email,created_at,created_by")
      .eq("project_id",project.id).order("created_at",{ascending:false}).limit(40),
    admin.from("studio_sessions").select("id,starts_at,location,status").eq("project_id",project.id)
      .order("starts_at",{ascending:false}).limit(100)
  ]);
  const invoices=invoiceResult.data||[];
  const sessions=sessionResult.data||[];
  const {created}=await searchParams;
  const newInvoice=invoices.find((row:any)=>row.public_token===created&&row.created_by===user.id&&row.status==="open");
  const enabled=process.env.PAYSTACK_PAYMENTS_ENABLED==="true";
  const mode=process.env.PAYSTACK_MODE==="live"?"live":"test";
  return <AppShell><main className={styles.root}>
    <div className={styles.eyebrow}>FACKTS MUSIC / {project.code} / FINANCE</div>
    <header className={styles.header}><div><h1>Project payments</h1><p>Issue invoices and collect through Paystack M-PESA. Verified receipts post to the existing finance tracker.</p></div>
      <div className={styles.tag}>{enabled?(mode==="test"?"SANDBOX — NO REAL MONEY":"LIVE COLLECTIONS"):"CHECKOUT DISABLED"}</div>
    </header>
    {newInvoice&&<section className={styles.success}><strong>Payment request created.</strong><p>Share the link below with the payer.</p><PaymentLinkCopy token={newInvoice.public_token}/></section>}
    {invoiceResult.error&&<p role="alert">Unable to load payment requests. Do not assume any invoice was saved; please check again.</p>}
    <section className={styles.panel} aria-label="How project payment links work"><h2>Who issues payment links?</h2><p>Project finance administrators, including authorised Project Leads, create links for approved one-time recording and production services. The amount is fixed on the server, not chosen by the payer.</p><p>A Paystack redirect does not prove payment. Only server-verified receipts count as collected funds. Settlement goes to the registered merchant account; this is not an artist payout service.</p><div className={styles.shortcuts}><Link href="/finance">Open project finance</Link><Link href="/billboard/submit">Release & fan support</Link></div></section>
    <section className={styles.panel}><h2>Create a payment request</h2>
      <p>Only approved project finance roles create links. Enter the agreed service and amount. This is a one-time payment request, not a subscription or artist-donation link.</p>
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
        <div><strong>KES {Number(row.amount_kes).toLocaleString("en-KE")}</strong>{row.status==="open"?<PaymentLinkCopy token={row.public_token}/>:<small>{row.status==="paid"?"Verified paid · no further payment required":"No active checkout link"}</small>}</div>
      </div>):<p>No invoices yet. Create your first above.</p>}</div>
    </section>
    <p className={styles.note}>No automatic payouts or artist wallets. Money settles to the merchant account registered with Paystack. <Link href="/finance">Open project finance →</Link></p>
  </main></AppShell>;
}
