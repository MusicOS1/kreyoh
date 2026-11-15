import {createAdminClient} from "../../../../lib/supabase/admin";
import PaymentCheckout from "../../PaymentCheckout";
import styles from "../../payments.module.css";

const labels:Record<string,string>={
  recording_session:"Recording session",project_contribution:"Project contribution",
  camera_hire:"Camera hire",set_design:"Studio set design",production_service:"Production service"
};

export default async function PayInvoice({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const valid=/^[0-9a-f-]{36}$/i.test(token);
  const admin=createAdminClient();
  const {data:invoice}=valid?await admin.from("project_payment_invoices")
    .select("public_token,purpose,description,amount_kes,status,payer_email,projects(name,code)")
    .eq("public_token",token).maybeSingle():{data:null};
  const project=invoice?(Array.isArray(invoice.projects)?invoice.projects[0]:invoice.projects) as any:null;
  const enabled=process.env.PAYSTACK_PAYMENTS_ENABLED==="true";
  const mode=process.env.PAYSTACK_MODE==="live"?"live":"test";
  return <main className={styles.checkoutRoot}><section className={styles.checkoutCard}>
    <div className={styles.brand}>FACKTS <span>MUSIC</span></div>
    {!invoice||invoice.status==="void"?<><h1>Payment link unavailable</h1><p>Please ask your project administrator for a new link.</p></>:
      invoice.status==="paid"?<><h1>Already paid</h1><p>This invoice has been settled. No additional payment is required.</p></>:
      <><div className={styles.eyebrow}>{project?.code||"PROJECT"} · {labels[invoice.purpose]||"Project payment"}</div>
        <h1>{invoice.description}</h1><p>{project?.name||"FACKTS Music"} · Secure Paystack checkout</p>
        <div className={styles.amountLabel}>TOTAL DUE</div><div className={styles.amount}>KES {Number(invoice.amount_kes).toLocaleString("en-KE")}</div>
        <PaymentCheckout token={token} assignedEmail={invoice.payer_email||""} disabled={!enabled}/>
        {!enabled&&<p className={styles.note}>Checkout is not activated in this environment yet.</p>}
        {mode==="test"&&<p className={styles.testBadge}>TEST MODE · No real money is collected</p>}
      </>}
  </section></main>;
}
