import {createAdminClient} from "../../../../lib/supabase/admin";
import {initializePaystack,paymentConfig,sameOrigin,validPayerEmail} from "../../../../lib/paystackPayments";

export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Invalid checkout origin."},{status:403});
  try{
    const {mode}=paymentConfig();
    const input=await request.json();
    const token=String(input?.token||"");
    const email=String(input?.email||"").trim().toLowerCase();
    if(!/^[0-9a-f-]{36}$/i.test(token)||!validPayerEmail(email))
      return Response.json({error:"Please enter a valid email address."},{status:400});
    const admin=createAdminClient();
    const {data:invoice,error}=await admin.from("project_payment_invoices")
      .select("id,project_id,amount_kes,purpose,status,payer_email")
      .eq("public_token",token).maybeSingle();
    if(error||!invoice||invoice.status!=="open")
      return Response.json({error:"This payment request is unavailable."},{status:404});
    if(invoice.payer_email&&invoice.payer_email.toLowerCase()!==email)
      return Response.json({error:"Use the email assigned to this invoice."},{status:403});
    const cutoff=new Date(Date.now()-10*60*1000).toISOString();
    const {count,error:countError}=await admin.from("project_payment_attempts")
      .select("id",{count:"exact",head:true}).eq("invoice_id",invoice.id).gte("created_at",cutoff);
    if(countError)throw new Error("Cannot confirm checkout attempts.");
    if((count||0)>=5)return Response.json({error:"Too many attempts. Try again shortly."},{status:429});
    const reference="FMPS-"+crypto.randomUUID().replaceAll("-","");
    const {data:attempt,error:insertError}=await admin.from("project_payment_attempts")
      .insert({invoice_id:invoice.id,reference,payer_email:email,mode,status:"created"})
      .select("id").single();
    if(insertError||!attempt)throw new Error("Checkout could not be created.");
    try{
      const url=await initializePaystack({email,reference,amountKes:invoice.amount_kes,invoiceId:invoice.id,projectId:invoice.project_id,purpose:invoice.purpose});
      await admin.from("project_payment_attempts")
        .update({status:"initialized",checkout_url:url,updated_at:new Date().toISOString()})
        .eq("id",attempt.id).eq("status","created");
      return Response.json({checkout_url:url,reference,mode},{headers:{"Cache-Control":"no-store"}});
    }catch{
      await admin.from("project_payment_attempts")
        .update({status:"initialization_failed",updated_at:new Date().toISOString()})
        .eq("id",attempt.id).eq("status","created");
      throw new Error("Paystack checkout is temporarily unavailable. Please try again.");
    }
  }catch(error){
    const message=error instanceof Error?error.message:"Payment unavailable.";
    const unavailable=/not enabled|not configured|not authorized/.test(message);
    return Response.json({error:unavailable?"Payments are not activated yet.":message},{status:unavailable?503:400,headers:{"Cache-Control":"no-store"}});
  }
}
