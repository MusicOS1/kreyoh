import {notFound} from "next/navigation";
import PublicNavigation from "../../../components/PublicNavigation";
import PublicFooter from "../../../components/PublicFooter";
import {createAdminClient} from "../../../lib/supabase/admin";
import {FINANCE_REQUEST_TYPES,canOfferCheckout} from "../../../lib/financePaymentRequests";
import styles from "../../fan-support/support.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Finance payment request | FACKTS Music",robots:{index:false,follow:false}};
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export default async function PaymentRequestPublic({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!uuid.test(token))notFound();
 const db=createAdminClient();
 const {data:request,error}=await db.from("finance_payment_requests")
  .select("id,purpose_code,receiver_scope,project_id,description,amount_kes,recurrence,status,checkout_state,expiry_date")
  .eq("public_token",token).maybeSingle();
 if(error||!request||request.status==="draft"||request.status==="cancelled")notFound();
 const expired=Boolean(request.expiry_date&&request.expiry_date<new Date().toISOString().slice(0,10));
 const label=FINANCE_REQUEST_TYPES.find(x=>x.code===request.purpose_code)?.name||"Payment request";
 const payable=!expired&&canOfferCheckout(request.status,request.purpose_code)&&request.checkout_state==="enabled";
 return <><PublicNavigation/><main className={styles.page}>
  <section className={styles.hero}><span>FACKTS MUSIC · FINANCE REQUEST</span>
   <h1>{label}</h1><p>{request.description}</p>
   <strong>{expired?"This request has expired.":payable?"Provider checkout approved.":"Payment not available yet. Do not send money based on this request."}</strong>
  </section>
  <section className={styles.info}><h2>KES {Number(request.amount_kes).toLocaleString("en-KE")}</h2>
   <p>Frequency: {request.recurrence==="one_time"?"One-time request":request.recurrence==="monthly"?"Monthly plan (not active)":"Yearly plan (not active)"}</p>
   <p>Recipient: {request.receiver_scope==="fackts_music"?"FACKTS Music business":"Designated music project — settlement and beneficiary approval required"}.</p>
   {!payable&&<p>No checkout, payment authorization, subscription renewal or funds transfer is offered on this page.</p>}
  </section>
 </main><PublicFooter/></>;
}
