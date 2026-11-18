import {createHmac,timingSafeEqual} from "node:crypto";
import {createAdminClient} from "./supabase/admin";

export type PaymentMode="test"|"live";
type Verification={status:boolean;data?:{
  id?:string|number;domain?:string;status?:string;reference?:string;
  amount?:number;currency?:string;channel?:string;
  customer?:{email?:string};
};message?:string};

export function paymentConfig(){
  const mode:PaymentMode=process.env.PAYSTACK_MODE==="live"?"live":"test";
  const enabled=process.env.PAYSTACK_PAYMENTS_ENABLED==="true";
  if(mode==="live" && process.env.PAYSTACK_LIVE_ENABLED!=="true")
    throw new Error("Live Paystack collections are not authorized in this deployment.");
  if(!enabled)throw new Error("Paystack checkout is not enabled.");
  const key=mode==="live"?process.env.PAYSTACK_LIVE_SECRET_KEY:process.env.PAYSTACK_TEST_SECRET_KEY;
  if(!key||!key.startsWith(mode==="live"?"sk_live_":"sk_test_"))
    throw new Error("Paystack server credentials are not configured for this environment.");
  return {mode,key};
}

export function paystackSiteUrl(){
  // A preview must return to its own deployment, not the production website.
  const previewHost=process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_URL
    ? "https://"+process.env.VERCEL_URL
    : null;
  const value=process.env.PAYSTACK_SITE_URL||previewHost||process.env.NEXT_PUBLIC_SITE_URL;
  if(!value)throw new Error("Site callback URL is not configured.");
  const parsed=new URL(value);
  if((parsed.protocol!=="https:" && !(parsed.protocol==="http:"&&parsed.hostname==="localhost"))
    ||parsed.username||parsed.password||parsed.search||parsed.hash)
    throw new Error("Payment callback URL must be a trusted HTTPS origin.");
  return parsed.origin;
}

export function isSafeCheckoutUrl(url:string){
  try{const parsed=new URL(url);return parsed.protocol==="https:"&&parsed.hostname==="checkout.paystack.com";}catch{return false;}
}

async function paystackRequest<T>(path:string,method:"GET"|"POST",payload?:unknown):Promise<T>{
  const {key}=paymentConfig();
  const response=await fetch("https://api.paystack.co"+path,{
    method,headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:payload?JSON.stringify(payload):undefined,
    cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok || !result?.status)throw new Error("Paystack could not complete the request. Please retry.");
  return result as T;
}

export async function initializePaystack(args:{
  email:string;amountKes:number;reference:string;invoiceId:string;projectId:string;purpose:string;
}){
  const base=paystackSiteUrl();
  const result=await paystackRequest<{status:boolean;data:{authorization_url:string;reference:string}}>("/transaction/initialize","POST",{
    email:args.email,amount:String(args.amountKes*100),currency:"KES",
    channels:["mobile_money"],reference:args.reference,
    callback_url:base+"/payments/complete",
    metadata:JSON.stringify({fackts_invoice:args.invoiceId,project_id:args.projectId,purpose:args.purpose}),
  });
  if(result.data.reference!==args.reference || !isSafeCheckoutUrl(result.data.authorization_url))
    throw new Error("Paystack checkout response was invalid.");
  return result.data.authorization_url;
}

function secureEqual(a:Buffer,b:Buffer){
  return a.length===b.length&&timingSafeEqual(a,b);
}

export function verifyPaystackWebhook(raw:Buffer,headers:Headers){
  const signature=headers.get("paystack-signature");
  const webhookSecret=process.env.PAYSTACK_WEBHOOK_SECRET;
  // Prefer the timestamped webhook signing secret. Paystack may still deliver
  // legacy x-paystack-signature events while switching to the newer scheme.
  // If a modern signature is present but invalid, never downgrade to legacy.
  if(signature){
    if(!webhookSecret?.startsWith("whsec_"))return false;
    const entries=signature.split(",").map(s=>s.trim());
    const timeEntries=entries.filter(s=>s.startsWith("t="));
    if(timeEntries.length!==1)return false;
    const timestamp=Number(timeEntries[0].slice(2));
    if(!Number.isSafeInteger(timestamp)||Math.abs(Math.floor(Date.now()/1000)-timestamp)>300)return false;
    const digest=createHmac("sha512",webhookSecret).update(String(timestamp)+".").update(raw).digest();
    return entries.filter(s=>s.startsWith("v1=")).some(s=>{
      const value=s.slice(3),colon=value.indexOf(":");
      const hex=colon<0?"":value.slice(colon+1);
      return /^[0-9a-f]{128}$/.test(hex)&&secureEqual(digest,Buffer.from(hex,"hex"));
    });
  }
  // Legacy fallback is permitted ONLY if Paystack-Signature is absent.
  // Paystack's official docs confirm both headers can coexist during migration.
  const legacy=headers.get("x-paystack-signature");
  if(!legacy||!/^[0-9a-f]{128}$/.test(legacy))return false;
  const {key}=paymentConfig();
  const digest=createHmac("sha512",key).update(raw).digest();
  return secureEqual(digest,Buffer.from(legacy,"hex"));
}

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validPayerEmail(email:string){
  return email.length<=254&&emailPattern.test(email);
}

export function sameOrigin(request:Request){
  const raw=request.headers.get("origin");
  if(!raw)return false;
  try{return new URL(raw).origin===new URL(request.url).origin;}catch{return false;}
}

export async function verifyAndRecordPaystack(reference:string){
  if(!/^FMPS-[0-9a-f]{32}$/.test(reference))throw new Error("Invalid transaction reference.");
  const {mode}=paymentConfig();
  const admin=createAdminClient();
  const {data:attempt,error:findError}=await admin.from("project_payment_attempts")
    .select("id,invoice_id,reference,mode,status,payer_email")
    .eq("reference",reference).maybeSingle();
  if(findError||!attempt)throw new Error("Payment attempt was not found.");
  if(attempt.mode!==mode)throw new Error("The payment belongs to another environment.");
  const {data:invoice,error:invoiceError}=await admin.from("project_payment_invoices")
    .select("id,amount_kes,status,payer_email").eq("id",attempt.invoice_id).maybeSingle();
  if(invoiceError||!invoice)throw new Error("Invoice could not be verified.");
  if(attempt.status==="succeeded")return {state:"paid" as const};
  if(invoice.status==="void")return {state:"unavailable" as const};

  const result=await paystackRequest<Verification>("/transaction/verify/"+encodeURIComponent(reference),"GET");
  const tx=result.data;
  if(!tx||tx.reference!==reference || tx.domain!==mode)
    throw new Error("Payment provider reference or environment mismatch.");
  if(tx.status!=="success"){
    if(["failed","abandoned","reversed"].includes(tx.status||"")){
      await admin.from("project_payment_attempts")
        .update({status:"failed",provider_status:tx.status,updated_at:new Date().toISOString()})
        .eq("id",attempt.id).neq("status","succeeded");
      return {state:"failed" as const};
    }
    return {state:"pending" as const};
  }
  if(tx.currency!=="KES"||!Number.isSafeInteger(tx.amount)||
    tx.amount!==invoice.amount_kes*100 ||tx.channel!=="mobile_money"||
    !tx.customer?.email||tx.customer.email.toLowerCase()!==attempt.payer_email.toLowerCase()||
    (invoice.payer_email&&invoice.payer_email.toLowerCase()!==attempt.payer_email.toLowerCase()))
      throw new Error("Payment details did not match this invoice. It has not been credited.");

  const {data:resultRow,error}=await admin.rpc("project_paystack_confirm",{
    p_reference:reference,p_amount_minor:tx.amount,p_currency:tx.currency,
    p_mode:mode,p_payer_email:tx.customer.email,p_provider_transaction_id:tx.id==null?null:String(tx.id)
  });
  if(error)throw new Error("Payment was confirmed by Paystack but finance posting requires reconciliation.");
  return {state:resultRow?.state==="invoice_already_paid"?"already_paid":"paid" as const};
}
